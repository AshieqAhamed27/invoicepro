import React, {
  useState,
  useEffect
} from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

export default function Settings() {
  const [form, setForm] =
    useState({
      companyName: '',
      gstNumber: '',
      upiId: '',
      address: '',
      logo: ''
    });

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile =
    async () => {
      try {
        setLoading(true);

        const res =
          await api.get(
            '/auth/me'
          );

        const user =
          res.data.user;

        setForm({
          companyName:
            user.companyName ||
            '',
          gstNumber:
            user.gstNumber ||
            '',
          upiId:
            user.upiId ||
            '',
          address:
            user.address ||
            '',
          logo:
            user.logo ||
            ''
        });

      } catch {
        alert(
          'Failed to load profile'
        );
      } finally {
        setLoading(false);
      }
    };

  const handleChange = (e) => {
    const {
      name,
      value
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      try {
        setSaving(true);

        const res =
          await api.put(
            '/auth/profile',
            form
          );

        localStorage.setItem(
          'user',
          JSON.stringify(
            res.data.user
          )
        );

        alert(
          'Profile updated successfully!'
        );

      } catch {
        alert(
          'Failed to save settings'
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">

        <div className="bg-gray-900/80 border border-gray-700 rounded-2xl shadow-xl p-6 md:p-8">

          <h1 className="text-2xl font-bold mb-6">
            Company Settings
          </h1>

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >

            <input
              name="companyName"
              value={
                form.companyName
              }
              onChange={
                handleChange
              }
              placeholder="Company Name"
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg"
            />

            <input
              name="gstNumber"
              value={
                form.gstNumber
              }
              onChange={
                handleChange
              }
              placeholder="GST Number"
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg"
            />

            <input
              name="upiId"
              value={
                form.upiId
              }
              onChange={
                handleChange
              }
              placeholder="UPI ID"
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg"
            />

            <textarea
              name="address"
              value={
                form.address
              }
              onChange={
                handleChange
              }
              placeholder="Company Address"
              rows="4"
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg"
            />

            <input
              name="logo"
              value={
                form.logo
              }
              onChange={
                handleChange
              }
              placeholder="Logo URL"
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg"
            />

            {form.logo && (
              <div className="flex justify-center">
                <img
                  src={form.logo}
                  alt="Logo Preview"
                  className="w-24 h-24 object-contain rounded-lg border border-gray-700"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : 'Save Settings'}
            </button>

          </form>

        </div>

      </main>
    </div>
  );
}