import OpenAI from "openai";
import { InsertJobDescription, JobDescription } from "@shared/schema";
import { storage } from "./storage";

// This will be initialized when needed and if the API key is available
let openai: OpenAI | null = null;

// Initialize OpenAI client if API key is available
function getOpenAIClient(): OpenAI | null {
  if (openai) return openai;
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OpenAI API key is not set. Job description generation is disabled.");
    return null;
  }
  
  openai = new OpenAI({ apiKey });
  return openai;
}

export interface JobDescriptionInput {
  userId: number;
  title: string;
  company?: string;
  department?: string;
  seniority?: string;
  industry?: string;
  skills?: string[];
  customInstructions?: string;
}

/**
 * Generate a job description using OpenAI
 * Note: This is a placeholder that will be fully implemented when OpenAI API key is provided
 */
export async function generateJobDescription(input: JobDescriptionInput): Promise<JobDescription> {
  const client = getOpenAIClient();
  
  // Conservative estimate of tokens to be used - will be refined with actual usage
  const estimatedTokensToUse = 2000; // GPT-4o typically uses more tokens than previous models
  
  // Check if the user has an active subscription with enough tokens
  const subscription = await storage.getActiveSubscriptionByUserId(input.userId);
  if (!subscription) {
    throw new Error("No active subscription found. Please subscribe to use this feature.");
  }
  
  if (subscription.token_balance < estimatedTokensToUse) {
    throw new Error("Insufficient token balance. Please add more tokens to your subscription.");
  }
  
  let jobDescription: JobDescription;
  
  if (client) {
    // When OpenAI API key is available, use the real implementation
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    
    try {
      // Generate the job description content using OpenAI
      const generatedContent = await generateJobDescriptionWithOpenAI(input);
      
      // Create the job description in the database
      const jobDescriptionData: Omit<InsertJobDescription, "user_id"> = {
        title: input.title,
        company: input.company || "",
        department: input.department || "",
        seniority: (input.seniority || "mid") as any,
        industry: input.industry || "",
        skills: input.skills || [],
        description: generatedContent.description,
        responsibilities: generatedContent.responsibilities,
        requirements: generatedContent.requirements,
        benefits: generatedContent.benefits,
        is_public: false
      };
      
      // Create the job description
      jobDescription = await storage.createJobDescription({
        user_id: input.userId,
        ...jobDescriptionData
      });
      
      // Deduct tokens from the subscription using the actual tokens used
      await storage.deductTokens(
        subscription.id,
        generatedContent.tokensUsed,
        `Generated job description for ${input.title}`
      );
      
      // Update tokens used in the job description
      await storage.updateJobDescription(jobDescription.id, {
        tokens_used: generatedContent.tokensUsed
      });
      
      return jobDescription;
    } catch (error) {
      console.error("Error generating job description:", error);
      throw new Error("Failed to generate job description. Please try again later.");
    }
  } else {
    // Create a placeholder job description when OpenAI is not available
    const jobDescriptionData: Omit<InsertJobDescription, "user_id"> = {
      title: input.title,
      company: input.company || "",
      department: input.department || "",
      seniority: (input.seniority || "mid") as any,
      industry: input.industry || "",
      skills: input.skills || [],
      description: "OpenAI integration is not available. Please provide an API key to enable job description generation.",
      responsibilities: "",
      requirements: "",
      benefits: "",
      is_public: false
    };
    
    jobDescription = await storage.createJobDescription({
      user_id: input.userId,
      ...jobDescriptionData
    });
    
    return jobDescription;
  }
}

/**
 * When OpenAI API key is available, this function implements the actual job description generation
 */
async function generateJobDescriptionWithOpenAI(input: JobDescriptionInput): Promise<{
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  tokensUsed: number;
}> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI API key is not set");
  }

  // Build a detailed prompt based on the input
  const skillsList = input.skills && input.skills.length > 0 
    ? `Required skills: ${input.skills.join(', ')}` 
    : '';
  
  const customPrompt = input.customInstructions 
    ? `Additional information from the hiring manager: ${input.customInstructions}` 
    : '';

  const prompt = `
Create a professional job description for a ${input.seniority || 'mid-level'} ${input.title} position
${input.company ? `at ${input.company}` : ''} 
${input.department ? `in the ${input.department} department` : ''}
${input.industry ? `within the ${input.industry} industry` : ''}.

${skillsList}

${customPrompt}

Please provide your response in the following JSON format:
{
  "description": "A compelling overview of the position and company",
  "responsibilities": "A bulleted list of key job responsibilities",
  "requirements": "A bulleted list of the required qualifications and skills",
  "benefits": "A bulleted list of the benefits and perks offered with the position"
}
`;

  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert HR professional who specializes in creating compelling job descriptions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    const result = JSON.parse(content);
    
    // Calculate tokens used - this is approximate
    // OpenAI charges for both input and output tokens
    const tokensUsed = Math.ceil(prompt.length / 4) + Math.ceil(content.length / 4);

    return {
      description: result.description || "No description provided",
      responsibilities: result.responsibilities || "No responsibilities provided",
      requirements: result.requirements || "No requirements provided",
      benefits: result.benefits || "No benefits provided",
      tokensUsed: tokensUsed
    };
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error("Failed to generate job description with OpenAI");
  }
}