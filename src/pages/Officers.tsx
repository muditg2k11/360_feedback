import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserCircle, Plus, Edit2, Trash2, Mail, Phone, Building2, Bell, BellOff } from 'lucide-react';

interface Officer {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  designation: string;
  department_id: string;
  is_active: boolean;
  department?: {
    name: string;
    short_name: string;
  };
  preferences?: Array<{
    notification_channels: string[];
    sentiment_threshold: number;
    enabled: boolean;
  }>;
}

interface Department {
  id: string;
  name: string;
  short_name: string;
}

export function Officers() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    designation: '',
    department_id: '',
    notification_channels: ['email'] as string[],
    sentiment_threshold: -0.3,
    bias_threshold: 60
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [officersRes, deptRes] = await Promise.all([
        supabase
          .from('pib_officers')
          .select(`
            *,
            department:government_departments(name, short_name),
            preferences:notification_preferences(notification_channels, sentiment_threshold, enabled)
          `)
          .order('full_name'),
        supabase
          .from('government_departments')
          .select('id, name, short_name')
          .order('name')
      ]);

      if (officersRes.error) throw officersRes.error;
      if (deptRes.error) throw deptRes.error;

      setOfficers(officersRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let officerId: string;

      if (editingOfficer) {
        const { error } = await supabase
          .from('pib_officers')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone_number: formData.phone_number,
            designation: formData.designation,
            department_id: formData.department_id
          })
          .eq('id', editingOfficer.id);

        if (error) throw error;
        officerId = editingOfficer.id;
      } else {
        const { data, error } = await supabase
          .from('pib_officers')
          .insert({
            full_name: formData.full_name,
            email: formData.email,
            phone_number: formData.phone_number,
            designation: formData.designation,
            department_id: formData.department_id,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;
        officerId = data.id;
      }

      await supabase
        .from('notification_preferences')
        .upsert({
          officer_id: officerId,
          notification_channels: formData.notification_channels,
          sentiment_threshold: formData.sentiment_threshold,
          bias_threshold: formData.bias_threshold,
          enabled: true
        }, {
          onConflict: 'officer_id'
        });

      await loadData();
      setShowAddModal(false);
      setEditingOfficer(null);
      resetForm();
    } catch (error) {
      console.error('Error saving officer:', error);
      alert('Failed to save officer');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone_number: '',
      designation: '',
      department_id: '',
      notification_channels: ['email'],
      sentiment_threshold: -0.3,
      bias_threshold: 60
    });
  };

  const handleEdit = (officer: Officer) => {
    setEditingOfficer(officer);
    setFormData({
      full_name: officer.full_name,
      email: officer.email,
      phone_number: officer.phone_number || '',
      designation: officer.designation || '',
      department_id: officer.department_id || '',
      notification_channels: officer.preferences?.[0]?.notification_channels || ['email'],
      sentiment_threshold: officer.preferences?.[0]?.sentiment_threshold || -0.3,
      bias_threshold: 60
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this officer?')) return;

    try {
      const { error } = await supabase
        .from('pib_officers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting officer:', error);
      alert('Failed to delete officer');
    }
  };

  const toggleActive = async (officer: Officer) => {
    try {
      const { error } = await supabase
        .from('pib_officers')
        .update({ is_active: !officer.is_active })
        .eq('id', officer.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating officer:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading officers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PIB Officers</h1>
          <p className="text-gray-600 mt-1">
            Manage officers and notification preferences for negative stories
          </p>
        </div>
        <button
          onClick={() => {
            setEditingOfficer(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Officer
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {officers.map((officer) => (
          <div
            key={officer.id}
            className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <UserCircle className="w-10 h-10 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{officer.full_name}</h3>
                  <p className="text-sm text-gray-500">{officer.designation}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleActive(officer)}
                  className={`p-2 rounded-lg ${
                    officer.is_active
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                  title={officer.is_active ? 'Active' : 'Inactive'}
                >
                  {officer.is_active ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleEdit(officer)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(officer.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                {officer.email}
              </div>
              {officer.phone_number && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {officer.phone_number}
                </div>
              )}
              {officer.department && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  {officer.department.short_name} - {officer.department.name}
                </div>
              )}
            </div>

            {officer.preferences?.[0] && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 mb-2">Notification Channels:</p>
                <div className="flex flex-wrap gap-1">
                  {officer.preferences[0].notification_channels.map((channel) => (
                    <span
                      key={channel}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                    >
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {officers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No officers yet</h3>
          <p className="text-gray-600 mb-4">Add your first PIB officer to get started</p>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingOfficer ? 'Edit Officer' : 'Add New Officer'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+91-11-23092462"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Deputy Director"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.short_name} - {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Channels
                </label>
                <div className="space-y-2">
                  {['email', 'sms', 'push'].map((channel) => (
                    <label key={channel} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.notification_channels.includes(channel)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              notification_channels: [...formData.notification_channels, channel]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              notification_channels: formData.notification_channels.filter(
                                (c) => c !== channel
                              )
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sentiment Alert Threshold
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="-1"
                  max="0"
                  value={formData.sentiment_threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, sentiment_threshold: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get notified when sentiment score is below this value (e.g., -0.3 for negative stories)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingOfficer ? 'Update Officer' : 'Add Officer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingOfficer(null);
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
