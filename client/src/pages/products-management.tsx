import { useState } from "react";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertProductSchema, insertProductCategorySchema } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Box, PackageOpen, Package, Edit, Trash2, Plus, Grid, List, Tag } from "lucide-react";

// Extended schemas with validation
const createProductSchema = insertProductSchema.extend({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  sku: z.string().min(3, "SKU must be at least 3 characters"),
  internal_cost: z.coerce.number().min(0, "Cost cannot be negative"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  token_cost: z.coerce.number().int().min(0, "Token cost must be a positive integer"),
  vat_rate: z.enum(["standard", "zero", "exempt", "reverse_charge"]),
});

const createCategorySchema = insertProductCategorySchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  parent_id: z.number().optional().nullable(),
});

export default function ProductsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("products");
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [isDeleteProductOpen, setIsDeleteProductOpen] = useState(false);
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);

  // Product form
  const productForm = useForm<z.infer<typeof createProductSchema>>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      description: "",
      category_id: undefined,
      sku: "",
      internal_cost: 0,
      price: 0,
      token_cost: 0,
      vat_rate: "standard",
      is_active: true,
    },
  });

  // Category form
  const categoryForm = useForm<z.infer<typeof createCategorySchema>>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      parent_id: null,
      is_active: true,
    },
  });

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["/api/product-categories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/product-categories");
      if (!response.ok) throw new Error("Failed to fetch product categories");
      return response.json();
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createProductSchema>) => {
      // Convert price values from dollars to cents for database storage
      const formattedData = {
        ...data,
        internal_cost: Math.round(data.internal_cost * 100),
        price: Math.round(data.price * 100),
      };
      
      const response = await apiRequest(
        "POST", 
        "/api/products", 
        formattedData
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create product");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product Created",
        description: "Product has been successfully created",
      });
      productForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof createProductSchema> }) => {
      // Convert price values from dollars to cents for database storage
      const formattedData = {
        ...data,
        internal_cost: Math.round(data.internal_cost * 100),
        price: Math.round(data.price * 100),
      };
      
      const response = await apiRequest(
        "PATCH", 
        `/api/products/${id}`, 
        formattedData
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update product");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product Updated",
        description: "Product has been successfully updated",
      });
      productForm.reset();
      setEditingProduct(null);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/products/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete product");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product Deleted",
        description: "Product has been successfully deleted",
      });
      setIsDeleteProductOpen(false);
      setProductToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createCategorySchema>) => {
      const response = await apiRequest(
        "POST", 
        "/api/product-categories", 
        data
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create category");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Category Created",
        description: "Category has been successfully created",
      });
      categoryForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof createCategorySchema> }) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/product-categories/${id}`, 
        data
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update category");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Category Updated",
        description: "Category has been successfully updated",
      });
      categoryForm.reset();
      setEditingCategory(null);
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/product-categories/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete category");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Category Deleted",
        description: "Category has been successfully deleted",
      });
      setIsDeleteCategoryOpen(false);
      setCategoryToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle product form submission
  function onProductSubmit(data: z.infer<typeof createProductSchema>) {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct, data });
    } else {
      createProductMutation.mutate(data);
    }
  }

  // Handle category form submission
  function onCategorySubmit(data: z.infer<typeof createCategorySchema>) {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  }

  // Set up product form for editing
  function handleEditProduct(productId: number) {
    const product = products.find((p) => p.id === productId);
    if (product) {
      // Convert cents to dollars for display in form
      productForm.reset({
        ...product,
        internal_cost: product.internal_cost / 100,
        price: product.price / 100,
      });
      setEditingProduct(productId);
      setActiveTab("products");
    }
  }

  // Set up category form for editing
  function handleEditCategory(categoryId: number) {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      categoryForm.reset(category);
      setEditingCategory(categoryId);
      setActiveTab("categories");
    }
  }

  // Cancel editing
  function handleCancelProductEdit() {
    setEditingProduct(null);
    productForm.reset();
  }

  function handleCancelCategoryEdit() {
    setEditingCategory(null);
    categoryForm.reset();
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Convert cents to dollars for display
  }

  // Get category name by id
  function getCategoryNameById(id: number | null | undefined) {
    if (!id) return "None";
    const category = categories.find((c) => c.id === id);
    return category ? category.name : "Unknown";
  }

  // Get parent category name by id
  function getParentCategoryName(id: number | null | undefined) {
    if (!id) return "None";
    const category = categories.find((c) => c.id === id);
    return category ? category.name : "Unknown";
  }

  // Filter categories to find subcategories
  function getSubcategories(parentId: number | null) {
    return categories.filter((category) => category.parent_id === parentId);
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Products Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your products and categories
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-gray-100 p-1">
              <TabsTrigger 
                value="products" 
                className="flex items-center" 
                data-state={activeTab === "products" ? "active" : ""}
              >
                <Package className="mr-2 h-4 w-4" />
                Products
              </TabsTrigger>
              
              <TabsTrigger 
                value="categories" 
                className="flex items-center"
                data-state={activeTab === "categories" ? "active" : ""}
              >
                <Grid className="mr-2 h-4 w-4" />
                Categories
              </TabsTrigger>
            </TabsList>
            
            {/* Products Tab */}
            <TabsContent value="products" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Product Form */}
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>{editingProduct ? "Edit Product" : "Add New Product"}</CardTitle>
                    <CardDescription>
                      {editingProduct 
                        ? "Update product information" 
                        : "Create a new product or service"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...productForm}>
                      <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4">
                        <FormField
                          control={productForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product Name*</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter product name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={productForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description*</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the product" 
                                  className="min-h-[80px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={productForm.control}
                          name="category_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(Number(value))}
                                value={field.value?.toString() || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="">None</SelectItem>
                                  {categories.map((category) => (
                                    <SelectItem 
                                      key={category.id} 
                                      value={category.id.toString()}
                                    >
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={productForm.control}
                          name="sku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU*</FormLabel>
                              <FormControl>
                                <Input placeholder="Product SKU" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={productForm.control}
                            name="internal_cost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Internal Cost* ($)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={productForm.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sales Price* ($)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={productForm.control}
                          name="token_cost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Token Cost*</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={productForm.control}
                          name="vat_rate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>VAT Rate*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select VAT rate" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="standard">Standard (5%)</SelectItem>
                                  <SelectItem value="zero">Zero Rated (0%)</SelectItem>
                                  <SelectItem value="exempt">Exempt</SelectItem>
                                  <SelectItem value="reverse_charge">Reverse Charge</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={productForm.control}
                          name="is_active"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                              </FormControl>
                              <FormLabel className="font-normal">Active</FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end pt-4 space-x-2">
                          {editingProduct && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={handleCancelProductEdit}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button 
                            type="submit" 
                            disabled={createProductMutation.isPending || updateProductMutation.isPending}
                          >
                            {editingProduct ? "Update Product" : "Add Product"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                {/* Products List */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Product List</CardTitle>
                    <CardDescription>
                      Manage your existing products
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingProducts ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <PackageOpen className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No products found. Add your first product to get started.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Internal Cost</TableHead>
                              <TableHead>Sales Price</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {products.map((product) => (
                              <TableRow key={product.id}>
                                <TableCell className="font-medium">
                                  <div>
                                    <div>{product.name}</div>
                                    <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                                  </div>
                                </TableCell>
                                <TableCell>{getCategoryNameById(product.category_id)}</TableCell>
                                <TableCell>{formatCurrency(product.internal_cost)}</TableCell>
                                <TableCell>{formatCurrency(product.price)}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    product.is_active 
                                      ? "bg-green-100 text-green-800" 
                                      : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {product.is_active ? "Active" : "Inactive"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditProduct(product.id)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog open={isDeleteProductOpen && productToDelete === product.id}>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setProductToDelete(product.id);
                                            setIsDeleteProductOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete the product "{product.name}"?
                                            This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel onClick={() => setIsDeleteProductOpen(false)}>
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => deleteProductMutation.mutate(product.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Categories Tab */}
            <TabsContent value="categories" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Category Form */}
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>{editingCategory ? "Edit Category" : "Add Category"}</CardTitle>
                    <CardDescription>
                      {editingCategory 
                        ? "Update category information" 
                        : "Create a new product category"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category Name*</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter category name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={categoryForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the category" 
                                  className="min-h-[80px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={categoryForm.control}
                          name="parent_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Parent Category</FormLabel>
                              <Select
                                onValueChange={(value) => 
                                  field.onChange(value ? Number(value) : null)
                                }
                                value={field.value?.toString() || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="None (Top Level)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="">None (Top Level)</SelectItem>
                                  {categories.map((category) => (
                                    // Don't allow a category to be its own parent
                                    // and don't allow circular references
                                    editingCategory !== category.id && (
                                      <SelectItem 
                                        key={category.id} 
                                        value={category.id.toString()}
                                      >
                                        {category.name}
                                      </SelectItem>
                                    )
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={categoryForm.control}
                          name="is_active"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                              </FormControl>
                              <FormLabel className="font-normal">Active</FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end pt-4 space-x-2">
                          {editingCategory && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={handleCancelCategoryEdit}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button 
                            type="submit" 
                            disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                          >
                            {editingCategory ? "Update Category" : "Add Category"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                {/* Categories List */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>
                      Manage your product categories and subcategories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCategories ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : categories.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Grid className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No categories found. Add your first category to get started.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Top-level categories */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-gray-500">Top-Level Categories</h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Subcategories</TableHead>
                                  <TableHead>Products</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {categories
                                  .filter(category => !category.parent_id)
                                  .map(category => {
                                    const subcategories = getSubcategories(category.id);
                                    const productsInCategory = products.filter(
                                      p => p.category_id === category.id
                                    );
                                    
                                    return (
                                      <TableRow key={category.id}>
                                        <TableCell className="font-medium">
                                          {category.name}
                                        </TableCell>
                                        <TableCell>
                                          {subcategories.length}
                                        </TableCell>
                                        <TableCell>
                                          {productsInCategory.length}
                                        </TableCell>
                                        <TableCell>
                                          <span className={`px-2 py-1 rounded-full text-xs ${
                                            category.is_active 
                                              ? "bg-green-100 text-green-800" 
                                              : "bg-gray-100 text-gray-800"
                                          }`}>
                                            {category.is_active ? "Active" : "Inactive"}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex justify-end space-x-2">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleEditCategory(category.id)}
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog open={isDeleteCategoryOpen && categoryToDelete === category.id}>
                                              <AlertDialogTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => {
                                                    setCategoryToDelete(category.id);
                                                    setIsDeleteCategoryOpen(true);
                                                  }}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Are you sure you want to delete the category "{category.name}"?
                                                    This action cannot be undone.
                                                    
                                                    {(subcategories.length > 0 || productsInCategory.length > 0) && (
                                                      <p className="mt-2 text-red-500 font-semibold">
                                                        Warning: This category has {subcategories.length} subcategories and {productsInCategory.length} products.
                                                        Deleting it will affect these items.
                                                      </p>
                                                    )}
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel onClick={() => setIsDeleteCategoryOpen(false)}>
                                                    Cancel
                                                  </AlertDialogCancel>
                                                  <AlertDialogAction 
                                                    onClick={() => deleteCategoryMutation.mutate(category.id)}
                                                    className="bg-red-600 hover:bg-red-700"
                                                  >
                                                    Delete
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                        
                        {/* Subcategories */}
                        {categories.some(category => category.parent_id) && (
                          <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-500">Subcategories</h3>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Parent Category</TableHead>
                                    <TableHead>Products</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {categories
                                    .filter(category => category.parent_id)
                                    .map(category => {
                                      const productsInCategory = products.filter(
                                        p => p.category_id === category.id
                                      );
                                      
                                      return (
                                        <TableRow key={category.id}>
                                          <TableCell className="font-medium">
                                            {category.name}
                                          </TableCell>
                                          <TableCell>
                                            {getParentCategoryName(category.parent_id)}
                                          </TableCell>
                                          <TableCell>
                                            {productsInCategory.length}
                                          </TableCell>
                                          <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                              category.is_active 
                                                ? "bg-green-100 text-green-800" 
                                                : "bg-gray-100 text-gray-800"
                                            }`}>
                                              {category.is_active ? "Active" : "Inactive"}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditCategory(category.id)}
                                              >
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                              <AlertDialog open={isDeleteCategoryOpen && categoryToDelete === category.id}>
                                                <AlertDialogTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                      setCategoryToDelete(category.id);
                                                      setIsDeleteCategoryOpen(true);
                                                    }}
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Are you sure you want to delete the category "{category.name}"?
                                                      This action cannot be undone.
                                                      
                                                      {productsInCategory.length > 0 && (
                                                        <p className="mt-2 text-red-500 font-semibold">
                                                          Warning: This category has {productsInCategory.length} products.
                                                          Deleting it will affect these items.
                                                        </p>
                                                      )}
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={() => setIsDeleteCategoryOpen(false)}>
                                                      Cancel
                                                    </AlertDialogCancel>
                                                    <AlertDialogAction 
                                                      onClick={() => deleteCategoryMutation.mutate(category.id)}
                                                      className="bg-red-600 hover:bg-red-700"
                                                    >
                                                      Delete
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}