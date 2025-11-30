import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Plus, Edit2, Trash2, Users, Tag, Mail, Phone } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  short_name: string;
  keywords: string[];
  contact_email: string;
  contact_phone: string;
  notification_enabled: boolean;
  created_at: string;
}

export function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    keywords: '',
    contact_email: '',
    contact_phone: '',
    notification_enabled: true
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('government_departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const keywords = formData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    try {
      if (editingDept) {
        const { error } = await supabase
          .from('government_departments')
          .update({
            name: formData.name,
            short_name: formData.short_name,
            keywords,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone,
            notification_enabled: formData.notification_enabled
          })
          .eq('id', editingDept.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('government_departments')
          .insert({
            name: formData.name,
            short_name: formData.short_name,
            keywords,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone,
            notification_enabled: formData.notification_enabled,
            hierarchy_level: 1
          });

        if (error) throw error;
      }

      await loadDepartments();
      setShowAddModal(false);
      setEditingDept(null);
      setFormData({
        name: '',
        short_name: '',
        keywords: '',
        contact_email: '',
        contact_phone: '',
        notification_enabled: true
      });
    } catch (error) {
      console.error('Error saving department:', error);
      alert('Failed to save department');
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      short_name: dept.short_name,
      keywords: dept.keywords.join(', '),
      contact_email: dept.contact_email || '',
      contact_phone: dept.contact_phone || '',
      notification_enabled: dept.notification_enabled
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      const { error } = await supabase
        .from('government_departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Failed to delete department');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading departments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Government Departments</h1>
          <p className="text-gray-600 mt-1">
            Manage ministries and departments for article categorization
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDept(null);
            setFormData({
              name: '',
              short_name: '',
              keywords: '',
              contact_email: '',
              contact_phone: '',
              notification_enabled: true
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      <div className="grid gap-6">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{dept.name}</h3>
                    <p className="text-sm text-gray-500">{dept.short_name}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Tag className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Keywords for Auto-Categorization:</p>
                      <div className="flex flex-wrap gap-1">
                        {dept.keywords.slice(0, 10).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                        {dept.keywords.length > 10 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{dept.keywords.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {dept.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {dept.contact_email}
                    </div>
                  )}

                  {dept.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {dept.contact_phone}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        dept.notification_enabled
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {dept.notification_enabled ? '🔔 Notifications ON' : '🔕 Notifications OFF'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(dept)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No departments yet</h3>
          <p className="text-gray-600 mb-4">Add your first government department to get started</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ministry of Home Affairs"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Name / Acronym *
                </label>
                <input
                  type="text"
                  value={formData.short_name}
                  onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="MHA"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords (comma-separated) *
                </label>
                <textarea
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="home affairs, internal security, police, border, immigration"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  These keywords are used for automatic article categorization
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="mha@gov.in"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+91-11-23092462"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={formData.notification_enabled}
                  onChange={(e) =>
                    setFormData({ ...formData, notification_enabled: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="notifications" className="text-sm text-gray-700">
                  Enable real-time notifications for negative stories
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingDept ? 'Update Department' : 'Add Department'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingDept(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
