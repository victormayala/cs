
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs, where, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FolderPlus, Edit, Trash2, AlertTriangle, FolderIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AppHeader from '@/components/layout/AppHeader';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarFooter, SidebarProvider } from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  userId: string;
  createdAt: any;
  productCount?: number;
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const catRef = collection(db, `users/${user.uid}/productCategories`);
    const q = query(catRef, orderBy("name"));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const fetchedCategories: ProductCategory[] = [];
      querySnapshot.forEach((doc) => {
        fetchedCategories.push({ id: doc.id, ...doc.data() } as ProductCategory);
      });
      
      // Fetch product counts
      const productsRef = collection(db, `users/${user.uid}/products`);
      const productsSnap = await getDocs(productsRef);
      const categoryCounts: Record<string, number> = {};
      productsSnap.forEach(doc => {
        const categoryId = doc.data().category;
        if (categoryId) {
          categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
        }
      });
      
      const categoriesWithCounts = fetchedCategories.map(cat => ({
        ...cat,
        productCount: categoryCounts[cat.id] || 0
      }));

      setCategories(categoriesWithCounts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching categories:", error);
      toast({ title: "Error", description: "Could not fetch categories.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const createSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleAddOrUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCategoryName.trim()) return;

    setIsSubmitting(true);
    const slug = createSlug(newCategoryName);

    try {
      if (editingCategory) {
        // Update existing category
        const catDocRef = doc(db, `users/${user.uid}/productCategories`, editingCategory.id);
        await updateDoc(catDocRef, {
          name: newCategoryName,
          slug,
          parentId: newCategoryParent || null,
        });
        toast({ title: "Category Updated", description: `"${newCategoryName}" has been updated.` });
      } else {
        // Add new category
        const catCollRef = collection(db, `users/${user.uid}/productCategories`);
        await addDoc(catCollRef, {
          name: newCategoryName,
          slug,
          parentId: newCategoryParent || null,
          userId: user.uid,
          createdAt: new Date(),
        });
        toast({ title: "Category Added", description: `"${newCategoryName}" has been created.` });
      }
      setNewCategoryName('');
      setNewCategoryParent(null);
      setEditingCategory(null);
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast({ title: "Error", description: `Could not save category: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (category: ProductCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryParent(category.parentId);
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryParent(null);
  };

  const startDeleting = (category: ProductCategory) => {
    setCategoryToDelete(category);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete || !user) return;
  
    const batch = writeBatch(db);
  
    // Find all products in this category and set their category to null
    const productsToUpdateQuery = query(
      collection(db, `users/${user.uid}/products`),
      where("category", "==", categoryToDelete.id)
    );
  
    const productsSnapshot = await getDocs(productsToUpdateQuery);
    productsSnapshot.forEach((productDoc) => {
      batch.update(productDoc.ref, { category: null });
    });
  
    // Find all children categories and set their parentId to null
    const childrenToUpdateQuery = query(
      collection(db, `users/${user.uid}/productCategories`),
      where("parentId", "==", categoryToDelete.id)
    );
  
    const childrenSnapshot = await getDocs(childrenToUpdateQuery);
    childrenSnapshot.forEach((childDoc) => {
      batch.update(childDoc.ref, { parentId: null });
    });
  
    // Delete the category itself
    const catDocRef = doc(db, `users/${user.uid}/productCategories`, categoryToDelete.id);
    batch.delete(catDocRef);
  
    try {
      await batch.commit();
      toast({ title: "Category Deleted", description: `"${categoryToDelete.name}" and its associations have been removed.` });
      setCategoryToDelete(null);
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast({ title: "Error", description: `Could not delete category: ${error.message}`, variant: "destructive" });
    }
  };
  
  // Memoized function to create a hierarchical tree from the flat category list.
  const categoryTree = useMemo(() => {
    // A type for tree nodes which includes children.
    type TreeNode = ProductCategory & { children: TreeNode[] };
    const nodeMap = new Map<string, TreeNode>();
    const tree: TreeNode[] = [];

    // First pass: create a map of all categories as tree nodes.
    categories.forEach(cat => {
      nodeMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: link children to their parents.
    nodeMap.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        tree.push(node);
      }
    });

    // Sort children alphabetically within each node.
    nodeMap.forEach(node => {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Sort root nodes alphabetically.
    tree.sort((a, b) => a.name.localeCompare(b.name));
    
    return tree;
  }, [categories]);

  // Recursive function to render category rows with correct indentation.
  const renderCategoryRows = (categoriesToRender: (ProductCategory & { children: (ProductCategory & { children: any[] })[] })[], level = 0): JSX.Element[] => {
    let rows: JSX.Element[] = [];
    categoriesToRender.forEach(cat => {
        rows.push(
            <TableRow key={cat.id}>
                <TableCell style={{ paddingLeft: `${1 + level * 1.5}rem` }}>
                    <span className="font-medium">{level > 0 && '— '}{cat.name}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                <TableCell className="text-center">{cat.productCount || 0}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => startEditing(cat)}><Edit className="h-4 w-4 mr-1"/> Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => startDeleting(cat)}><Trash2 className="h-4 w-4 mr-1"/> Delete</Button>
                </TableCell>
            </TableRow>
        );
        if (cat.children && cat.children.length > 0) {
            rows = rows.concat(renderCategoryRows(cat.children, level + 1));
        }
    });
    return rows;
  };

  // Recursive function to render category options for the select dropdown.
  const renderCategoryOptions = (categoriesToRender: (ProductCategory & { children: any[] })[], level = 0): JSX.Element[] => {
    let options: JSX.Element[] = [];
    categoriesToRender.forEach(cat => {
        // Prevent a category from being its own parent.
        if (editingCategory && cat.id === editingCategory.id) return;
        
        options.push(
            <SelectItem key={cat.id} value={cat.id}>
                <span style={{ paddingLeft: `${level * 1.5}rem` }}>{cat.name}</span>
            </SelectItem>
        );
        if (cat.children && cat.children.length > 0) {
            options = options.concat(renderCategoryOptions(cat.children, level + 1));
        }
    });
    return options;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
       <main className="flex-1 p-4 md:p-6 lg:p-8 bg-muted/30">
          <div className="container mx-auto space-y-8">
            <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Product Categories</h1>
             <div className="grid gap-8 md:grid-cols-12">
                <div className="md:col-span-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{editingCategory ? "Edit Category" : "Add New Category"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddOrUpdateCategory} className="space-y-4">
                                <div>
                                    <Label htmlFor="category-name">Name</Label>
                                    <Input 
                                        id="category-name" 
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        required
                                        disabled={isSubmitting}
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">The name is how it appears on your site.</p>
                                </div>
                                <div>
                                    <Label htmlFor="category-parent">Parent Category</Label>
                                    <Select 
                                        value={newCategoryParent || 'none'}
                                        onValueChange={(value) => setNewCategoryParent(value === 'none' ? null : value)}
                                        disabled={isSubmitting}
                                    >
                                        <SelectTrigger id="category-parent">
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {renderCategoryOptions(categoryTree)}
                                        </SelectContent>
                                    </Select>
                                     <p className="text-sm text-muted-foreground mt-1">Assign a parent term to create a hierarchy.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                     <Button type="submit" disabled={isSubmitting || !newCategoryName.trim()}>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                                        {editingCategory ? "Update Category" : "Add New Category"}
                                    </Button>
                                    {editingCategory && (
                                        <Button type="button" variant="outline" onClick={cancelEditing}>Cancel</Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Existing Categories</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                            ) : categories.length === 0 ? (
                                <div className="text-center py-10">
                                    <FolderIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <p className="mt-4 text-muted-foreground">No categories found. Add one to get started.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Slug</TableHead>
                                            <TableHead className="text-center">Count</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {renderCategoryRows(categoryTree)}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
             </div>
          </div>
       </main>
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will delete the category "{categoryToDelete?.name}". Any products in this category will become uncategorized. Any subcategories will become top-level categories. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
