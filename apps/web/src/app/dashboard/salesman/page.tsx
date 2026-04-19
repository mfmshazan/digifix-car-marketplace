'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Plus, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  User,
  Settings,
  LogOut,
  Eye,
  Edit,
  Trash2,
  Store,
  ArrowRight,
  Upload,
  X,
  Camera,
  Phone
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { resolveMediaUrl } from '@/lib/api';

export default function SalesmanDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, refreshProfile } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'SALESMAN') {
      router.push('/dashboard/customer');
    }
  }, [isAuthenticated, user, router]);

  // Sync profile data on mount to ensure mobile updates are reflected
  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    }
  }, [isAuthenticated, refreshProfile]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#00002E] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const avatarUrl = resolveMediaUrl(user.avatar);

  const stats = [
    { label: 'Total Products', value: '24', icon: Package, color: 'bg-blue-100 text-blue-600', change: '+3' },
    { label: 'Total Sales', value: 'Rs. 125K', icon: DollarSign, color: 'bg-green-100 text-green-600', change: '+12%' },
    { label: 'Orders', value: '18', icon: ShoppingCart, color: 'bg-purple-100 text-purple-600', change: '+5' },
    { label: 'Views', value: '1.2K', icon: Eye, color: 'bg-orange-100 text-orange-600', change: '+8%' },
  ];

  const recentProducts = [
    { id: '1', name: 'Front Brake Pad Set', price: 4500, stock: 15, sales: 8, image: null },
    { id: '2', name: 'Oil Filter', price: 850, stock: 42, sales: 25, image: null },
    { id: '3', name: 'Air Filter', price: 1200, stock: 28, sales: 12, image: null },
    { id: '4', name: 'Spark Plug Set', price: 2800, stock: 18, sales: 6, image: null },
  ];

  const recentOrders = [
    { id: 'ORD-101', customer: 'John Doe', date: '2024-01-15', status: 'Pending', total: 9500 },
    { id: 'ORD-102', customer: 'Jane Smith', date: '2024-01-14', status: 'Shipped', total: 4500 },
    { id: 'ORD-103', customer: 'Mike Brown', date: '2024-01-13', status: 'Delivered', total: 12800 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      case 'Shipped': return 'bg-blue-100 text-blue-700';
      case 'Delivered': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#00002E]/5 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                {avatarUrl ? (
                  <Image 
                    src={avatarUrl} 
                    alt={user.name || ''} 
                    width={64} 
                    height={64} 
                    className="rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <Store className="w-8 h-8 text-[#00002E]" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user.store?.name || `${user.name}'s Store`}</h1>
                <div className="flex flex-col text-gray-600 gap-0.5">
                  <p>Welcome back, {user.name || 'Seller'}!</p>
                  {user.phone && <p className="text-sm flex items-center gap-1.5 font-medium"><Phone className="w-3.5 h-3.5" />{user.phone}</p>}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
              <button onClick={handleLogout} className="px-4 py-2 border border-gray-200 hover:border-red-300 text-red-600 hover:text-red-700 font-medium rounded-xl transition-all flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-green-600 font-medium">{stat.change}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Products */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">My Products</h2>
              <Link href="/dashboard/salesman/products" className="text-[#00002E] hover:text-[#000050] text-sm font-medium flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium">Sales</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                          <span className="font-medium text-gray-900">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-900">Rs. {product.price.toLocaleString()}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock > 20 ? 'bg-green-100 text-green-700' : 
                          product.stock > 5 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {product.stock} units
                        </span>
                      </td>
                      <td className="py-4 text-gray-600">{product.sales} sold</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <button aria-label="Edit product" className="p-2 text-gray-400 hover:text-[#00002E] transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button aria-label="Delete product" className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              <Link href="/dashboard/salesman/orders" className="text-[#00002E] hover:text-[#000050] text-sm font-medium flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{order.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{order.customer}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{order.date}</span>
                    <span className="font-semibold text-gray-900">Rs. {order.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function AddProductModal({ onClose }: { onClose: () => void }) {
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    condition: 'NEW',
    categoryId: '',
    carNumberPlate: '',
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement product creation API call
    console.log('Creating product:', { ...formData, images });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Images (Up to 5)
            </label>
            <div className="flex flex-wrap gap-3">
              {images.map((image, index) => (
                <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                  <Image src={image} alt={`Product ${index + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove image ${index + 1}`}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#00002E] transition-colors">
                  <Camera className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E]"
              placeholder="e.g., Front Brake Pad Set"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] h-24 resize-none"
              placeholder="Describe your product..."
            />
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price (Rs.)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E]"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E]"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
            <div className="flex gap-3">
              {['NEW', 'USED', 'RECONDITIONED'].map((condition) => (
                <button
                  key={condition}
                  type="button"
                  onClick={() => setFormData({ ...formData, condition })}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    formData.condition === condition
                      ? 'bg-[#00002E] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {condition}
                </button>
              ))}
            </div>
          </div>

          {/* Car Number Plate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Car Number Plate</label>
            <input
              type="text"
              value={formData.carNumberPlate}
              onChange={(e) => setFormData({ ...formData, carNumberPlate: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00002E]/30 focus:border-[#00002E] uppercase"
              placeholder="e.g., CAB-1234"
              required
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl transition-all">
              Add Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
