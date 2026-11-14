import React, { useState, useEffect } from 'react';
import {
  CMSPageContent,
  FeaturedSpotlight,
  SellerPromotionCampaign,
  SiteBrandingSettings,
  CMSSection,
  MediaAsset,
  CMSVersionEntry,
} from '../../types';
import {
  fetchCMSPagesFromDb,
  updateCMSPageInDb,
} from '../../services/adminService';
import {
  fetchFeaturedSpotlights,
  createFeaturedSpotlight,
  updateFeaturedSpotlight,
  deleteFeaturedSpotlight,
  fetchSellerPromotionCampaigns,
  updateSellerPromotionCampaign,
} from '../../services/dbService';
import {
  fetchSiteSettings,
  updateSiteSettings,
  fetchCMSSections,
  saveCMSSection,
  deleteCMSSection,
  fetchMediaAssets,
  archiveMediaAsset,
  restoreMediaAsset,
  fetchCMSVersionHistory,
} from '../../services/cmsService';
import { uploadCmsMedia } from '../../services/storageService';
import { useAuth } from '../../context/AuthContext';

export type CMSAdminSubView =
  | 'branding'
  | 'sections'
  | 'media'
  | 'banners'
  | 'cms'
  | 'coupons'
  | 'history';

export const AdminCMSMarketingTab: React.FC<{ initialSubView?: CMSAdminSubView }> = ({
  initialSubView = 'branding',
}) => {
  const { userProfile: currentAdmin } = useAuth();
  const [subView, setSubView] = useState<CMSAdminSubView>(initialSubView);

  // Site Branding State
  const [branding, setBranding] = useState<SiteBrandingSettings | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);

  // Dynamic Homepage Sections
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [editingSection, setEditingSection] = useState<CMSSection | null>(null);

  // Media Library State
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaFilterType, setMediaFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [mediaSearch, setMediaSearch] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [copiedMediaUrl, setCopiedMediaUrl] = useState<string | null>(null);

  // Spotlights / Banners
  const [spotlights, setSpotlights] = useState<FeaturedSpotlight[]>([]);
  const [isAddSpotlightOpen, setIsAddSpotlightOpen] = useState(false);
  const [spotlightForm, setSpotlightForm] = useState<Partial<FeaturedSpotlight>>({
    type: 'district_spotlight',
    targetTitle: '',
    targetId: 'Dhaka',
    district: 'Dhaka',
    bannerUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&auto=format&fit=crop&q=80',
    priority: 1,
    active: true,
  });

  // CMS Pages
  const [cmsPages, setCmsPages] = useState<CMSPageContent[]>([]);
  const [selectedCmsPage, setSelectedCmsPage] = useState<CMSPageContent | null>(null);

  // Campaigns & Version History
  const [campaigns, setCampaigns] = useState<SellerPromotionCampaign[]>([]);
  const [versionHistory, setVersionHistory] = useState<CMSVersionEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [brand, sec, media, spot, pages, camp, vers] = await Promise.all([
          fetchSiteSettings(),
          fetchCMSSections(),
          fetchMediaAssets(),
          fetchFeaturedSpotlights(),
          fetchCMSPagesFromDb(),
          fetchSellerPromotionCampaigns(),
          fetchCMSVersionHistory(),
        ]);
        setBranding(brand);
        setSections(sec);
        setMediaAssets(media);
        setSpotlights(spot);
        setCmsPages(pages);
        if (pages.length > 0) setSelectedCmsPage(pages[0]);
        setCampaigns(camp);
        setVersionHistory(vers);
      } catch (err) {
        console.error('Error loading CMS data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Branding Handlers
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branding) return;
    setBrandingSaving(true);
    try {
      const updated = await updateSiteSettings(branding, currentAdmin?.email || 'admin@sunno.eco');
      setBranding(updated);
      showToast('Global branding & announcement settings saved successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save branding.');
    } finally {
      setBrandingSaving(false);
    }
  };

  // Section Handlers
  const handleSaveSection = async (sec: CMSSection) => {
    try {
      const saved = await saveCMSSection(sec, currentAdmin?.email || 'admin@sunno.eco');
      setSections((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      setEditingSection(null);
      showToast(`CMS Section "${saved.title}" updated!`);
    } catch (err) {
      console.error('Error saving section:', err);
    }
  };

  const handleToggleSectionActive = async (sec: CMSSection) => {
    const updated = { ...sec, active: !sec.active };
    await handleSaveSection(updated);
  };

  // Media Library Upload Handler
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploadingMedia(true);
    try {
      const result = await uploadCmsMedia(file, 'general', currentAdmin?.email || 'admin@sunno.eco');
      const refreshed = await fetchMediaAssets();
      setMediaAssets(refreshed);
      showToast(`Media asset "${file.name}" uploaded successfully!`);
    } catch (err: any) {
      showToast(err.message || 'Upload failed.');
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleCopyMediaUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedMediaUrl(url);
    setTimeout(() => setCopiedMediaUrl(null), 2000);
    showToast('Asset URL copied to clipboard!');
  };

  const handleArchiveMedia = async (assetId: string) => {
    await archiveMediaAsset(assetId, currentAdmin?.email || 'admin@sunno.eco');
    setMediaAssets((prev) => prev.filter((m) => m.id !== assetId));
    showToast('Asset archived from media library.');
  };

  // Spotlights Handlers
  const handleSaveSpotlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotlightForm.targetTitle) return;
    try {
      const created = await createFeaturedSpotlight({
        type: spotlightForm.type || 'district_spotlight',
        targetId: spotlightForm.targetId || 'Dhaka',
        targetTitle: spotlightForm.targetTitle,
        district: spotlightForm.district || 'Dhaka',
        bannerUrl: spotlightForm.bannerUrl,
        priority: Number(spotlightForm.priority) || 1,
        active: spotlightForm.active ?? true,
        updatedBy: currentAdmin?.email || 'admin@sunno.eco',
      }, currentAdmin?.id || 'admin-01');
      setSpotlights((prev) => [created, ...prev]);
      setIsAddSpotlightOpen(false);
      showToast(`Featured banner "${created.targetTitle}" created!`);
    } catch (err) {
      console.error('Failed to create spotlight:', err);
    }
  };

  const handleToggleSpotlight = async (spot: FeaturedSpotlight) => {
    const newActive = !spot.active;
    await updateFeaturedSpotlight(spot.id, { active: newActive }, currentAdmin?.email || 'admin@sunno.eco');
    setSpotlights((prev) => prev.map((s) => (s.id === spot.id ? { ...s, active: newActive } : s)));
    showToast(`Banner "${spot.targetTitle}" ${newActive ? 'activated' : 'deactivated'}.`);
  };

  const handleDeleteSpotlight = async (id: string) => {
    await deleteFeaturedSpotlight(id, currentAdmin?.email || 'admin@sunno.eco');
    setSpotlights((prev) => prev.filter((s) => s.id !== id));
    showToast('Featured banner deleted.');
  };

  // CMS Handlers
  const handleSaveCmsPage = async () => {
    if (!selectedCmsPage) return;
    try {
      await updateCMSPageInDb(selectedCmsPage.id, selectedCmsPage, currentAdmin?.email || 'admin@sunno.eco');
      setCmsPages((prev) => prev.map((p) => (p.id === selectedCmsPage.id ? selectedCmsPage : p)));
      showToast(`Content page "${selectedCmsPage.title}" published!`);
    } catch (err) {
      console.error('Failed to update CMS page:', err);
    }
  };

  // Campaign Handlers
  const handleUpdateCampaignStatus = async (
    campId: string,
    status: 'approved' | 'rejected' | 'active'
  ) => {
    await updateSellerPromotionCampaign(campId, { status }, currentAdmin?.email || 'admin@sunno.eco');
    setCampaigns((prev) => prev.map((c) => (c.id === campId ? { ...c, status } : c)));
    showToast(`Seller promotion campaign status updated to "${status.toUpperCase()}".`);
  };

  const filteredMedia = mediaAssets.filter((m) => {
    if (mediaFilterType !== 'all' && m.fileType !== mediaFilterType) return false;
    if (mediaSearch.trim()) {
      const q = mediaSearch.toLowerCase().trim();
      return m.fileName.toLowerCase().includes(q) || m.altText?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#002c11] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-[#a0f399]/50 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px] text-[#a0f399]">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Sub-Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#002c11] font-heading">
            CMS &amp; Marketplace Experience Hub
          </h2>
          <p className="text-xs text-[#717970] mt-0.5">
            Single Source of Truth for branding, homepage sections, media assets, policy pages, and version history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-[#f0eded] p-1.5 rounded-2xl border border-[#c1c9be]/40">
          <button
            onClick={() => setSubView('branding')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subView === 'branding' ? 'bg-[#002c11] text-white shadow-xs' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Site Branding
          </button>
          <button
            onClick={() => setSubView('sections')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subView === 'sections' ? 'bg-[#002c11] text-white shadow-xs' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Homepage Sections ({sections.length})
          </button>
          <button
            onClick={() => setSubView('media')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subView === 'media' ? 'bg-[#002c11] text-white shadow-xs' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Media Library ({mediaAssets.length})
          </button>
          <button
            onClick={() => setSubView('banners')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subView === 'banners' ? 'bg-[#002c11] text-white shadow-xs' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Spotlights ({spotlights.length})
          </button>
          <button
            onClick={() => setSubView('cms')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subView === 'cms' ? 'bg-[#002c11] text-white shadow-xs' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Policy Pages ({cmsPages.length})
          </button>
          <button
            onClick={() => setSubView('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subView === 'history' ? 'bg-[#002c11] text-white shadow-xs' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Audit &amp; History ({versionHistory.length})
          </button>
        </div>
      </div>

      {/* 1. SUBVIEW: SITE BRANDING & GLOBAL SETTINGS */}
      {subView === 'branding' && branding && (
        <form onSubmit={handleSaveBranding} className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-[#002c11] font-heading">
                  Global Site Branding &amp; Announcement Header
                </h3>
                <p className="text-xs text-stone-500">
                  Update public marketplace identity, official logo, favicon, contact channels, and dynamic banner.
                </p>
              </div>
              <button
                type="submit"
                disabled={brandingSaving}
                className="px-5 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {brandingSaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Save Branding Configuration</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Marketplace Platform Name *</label>
                  <input
                    type="text"
                    required
                    value={branding.siteName}
                    onChange={(e) => setBranding({ ...branding, siteName: e.target.value })}
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={branding.tagline}
                    onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Official Logo URL</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={branding.logoUrl}
                      onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                      className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                    />
                    {branding.logoUrl && (
                      <img src={branding.logoUrl} alt="Logo Preview" className="w-9 h-9 object-contain rounded-lg border border-stone-200" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Favicon URL</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={branding.faviconUrl}
                      onChange={(e) => setBranding({ ...branding, faviconUrl: e.target.value })}
                      className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                    />
                    {branding.faviconUrl && (
                      <img src={branding.faviconUrl} alt="Favicon Preview" className="w-6 h-6 object-contain" />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Public Support Email</label>
                  <input
                    type="email"
                    value={branding.contactEmail}
                    onChange={(e) => setBranding({ ...branding, contactEmail: e.target.value })}
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Customer Helpline Hotline</label>
                  <input
                    type="text"
                    value={branding.contactPhone}
                    onChange={(e) => setBranding({ ...branding, contactPhone: e.target.value })}
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Support Hours</label>
                  <input
                    type="text"
                    value={branding.supportHours}
                    onChange={(e) => setBranding({ ...branding, supportHours: e.target.value })}
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Copyright Footer Notice</label>
                  <input
                    type="text"
                    value={branding.copyrightText}
                    onChange={(e) => setBranding({ ...branding, copyrightText: e.target.value })}
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                  />
                </div>
              </div>
            </div>

            {/* Announcement Bar Section */}
            <div className="pt-6 border-t border-stone-100 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#002c11]">Top Announcement Bar</h4>
                  <p className="text-stone-500 text-[11px]">Displays prominent banner at the very top of all public pages.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                  <input
                    type="checkbox"
                    checked={branding.announcementActive}
                    onChange={(e) => setBranding({ ...branding, announcementActive: e.target.checked })}
                    className="rounded text-[#1b6d24]"
                  />
                  <span>Enable Banner</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Banner Announcement Text</label>
                  <input
                    type="text"
                    value={branding.announcementText || ''}
                    onChange={(e) => setBranding({ ...branding, announcementText: e.target.value })}
                    placeholder="e.g. 🌿 Special Eid Artisan Exhibition — Free Shipping Over ৳1000"
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Target Link / Hashtag</label>
                  <input
                    type="text"
                    value={branding.announcementLink || ''}
                    onChange={(e) => setBranding({ ...branding, announcementLink: e.target.value })}
                    placeholder="e.g. #all_products or #districts"
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* 2. SUBVIEW: DYNAMIC HOMEPAGE SECTIONS */}
      {subView === 'sections' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">
              Manage homepage presentation structure, featured categories, and artisan highlights.
            </span>
          </div>

          <div className="space-y-4">
            {sections.map((sec) => (
              <div
                key={sec.id}
                className="bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f5e9] text-[#1b6d24] uppercase">
                      {sec.type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono">Order #{sec.displayOrder}</span>
                  </div>
                  <h4 className="font-bold text-sm text-[#002c11]">{sec.title}</h4>
                  {sec.subtitle && <p className="text-xs text-stone-500">{sec.subtitle}</p>}
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => handleToggleSectionActive(sec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      sec.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {sec.active ? 'Active' : 'Hidden'}
                  </button>
                  <button
                    onClick={() => setEditingSection(sec)}
                    className="px-3.5 py-1.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Edit Section
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Section Modal */}
          {editingSection && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <h3 className="font-bold text-base text-[#002c11]">Edit Section: {editingSection.title}</h3>
                  <button onClick={() => setEditingSection(null)} className="text-stone-400 hover:text-stone-700">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Section Title *</label>
                    <input
                      type="text"
                      value={editingSection.title}
                      onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                      className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-[#1b6d24]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={editingSection.subtitle || ''}
                      onChange={(e) => setEditingSection({ ...editingSection, subtitle: e.target.value })}
                      className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-[#1b6d24]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Banner Image URL</label>
                    <input
                      type="text"
                      value={editingSection.bannerUrl || ''}
                      onChange={(e) => setEditingSection({ ...editingSection, bannerUrl: e.target.value })}
                      className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-[#1b6d24]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">CTA Button Text</label>
                      <input
                        type="text"
                        value={editingSection.ctaText || ''}
                        onChange={(e) => setEditingSection({ ...editingSection, ctaText: e.target.value })}
                        className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3 py-2 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">CTA Link</label>
                      <input
                        type="text"
                        value={editingSection.ctaLink || ''}
                        onChange={(e) => setEditingSection({ ...editingSection, ctaLink: e.target.value })}
                        className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3 py-2 outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingSection(null)}
                      className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSection(editingSection)}
                      className="px-5 py-2 rounded-xl bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SUBVIEW: MEDIA LIBRARY */}
      {subView === 'media' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search assets by filename or tags..."
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                className="bg-[#f0eded] border border-stone-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#1b6d24] w-64"
              />
              <select
                value={mediaFilterType}
                onChange={(e) => setMediaFilterType(e.target.value as any)}
                className="bg-[#f0eded] border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
              >
                <option value="all">All File Types</option>
                <option value="image">Images Only</option>
                <option value="video">Videos Only</option>
              </select>
            </div>

            <label className="px-4 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs">
              {isUploadingMedia ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Uploading to Firebase Storage...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px] text-[#a0f399]">upload</span>
                  <span>Upload Image or Video (up to 50MB)</span>
                </>
              )}
              <input
                type="file"
                disabled={isUploadingMedia}
                accept="image/*,video/mp4,video/webm"
                onChange={handleMediaUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredMedia.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-stone-200 p-2.5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-stone-100 relative mb-2">
                  {m.fileType === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-stone-900 text-white">
                      <span className="material-symbols-outlined text-[28px] text-[#a0f399]">videocam</span>
                    </div>
                  ) : (
                    <img src={m.url} alt={m.altText || m.fileName} className="w-full h-full object-cover" />
                  )}
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-bold rounded uppercase">
                    {m.fileType}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-stone-800 truncate" title={m.fileName}>
                    {m.fileName}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    {(m.sizeBytes / 1024).toFixed(0)} KB • {m.category}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between gap-1">
                  <button
                    onClick={() => handleCopyMediaUrl(m.url)}
                    className="text-[10px] font-bold text-[#1b6d24] hover:underline flex items-center gap-0.5 cursor-pointer"
                    title="Copy URL"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedMediaUrl === m.url ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedMediaUrl === m.url ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => handleArchiveMedia(m.id)}
                    className="text-stone-400 hover:text-red-600 transition-colors p-1"
                    title="Archive Asset"
                  >
                    <span className="material-symbols-outlined text-[14px]">archive</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SUBVIEW: BANNERS & SPOTLIGHTS */}
      {subView === 'banners' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#717970]">
              Featured banners and 64-district spotlights displayed across the public marketplace.
            </span>
            <button
              onClick={() => setIsAddSpotlightOpen(true)}
              className="px-4 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px] text-[#a0f399]">add_photo_alternate</span>
              Add Featured Banner
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {spotlights.map((spot) => (
              <div
                key={spot.id}
                className="bg-white rounded-3xl border border-[#c1c9be]/60 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="h-40 relative bg-[#07170d]">
                  <img
                    src={spot.bannerUrl || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800'}
                    alt={spot.targetTitle}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm ${
                        spot.active ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {spot.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1b6d24]">
                      {spot.type.replace('_', ' ')} • Priority {spot.priority}
                    </span>
                    <h3 className="font-bold text-sm text-[#002c11] mt-0.5 line-clamp-1">{spot.targetTitle}</h3>
                    <p className="text-xs text-[#717970] mt-1">District: {spot.district || 'All Bangladesh'}</p>
                  </div>

                  <div className="pt-3 border-t border-[#f0eded] flex items-center justify-between text-xs font-bold">
                    <button
                      onClick={() => handleToggleSpotlight(spot)}
                      className="text-[#1b6d24] hover:underline"
                    >
                      {spot.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteSpotlight(spot.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Spotlight Modal */}
          {isAddSpotlightOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <h3 className="font-bold text-base text-[#002c11]">New Featured Spotlight Banner</h3>
                  <button onClick={() => setIsAddSpotlightOpen(false)} className="text-stone-400 hover:text-stone-700">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleSaveSpotlight} className="mt-4 space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Banner Title *</label>
                    <input
                      type="text"
                      required
                      value={spotlightForm.targetTitle}
                      onChange={(e) => setSpotlightForm({ ...spotlightForm, targetTitle: e.target.value })}
                      placeholder="e.g. Tangail Weavers Festival"
                      className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-[#1b6d24]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Image URL *</label>
                    <input
                      type="text"
                      required
                      value={spotlightForm.bannerUrl}
                      onChange={(e) => setSpotlightForm({ ...spotlightForm, bannerUrl: e.target.value })}
                      className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-[#1b6d24]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">District</label>
                      <input
                        type="text"
                        value={spotlightForm.district}
                        onChange={(e) => setSpotlightForm({ ...spotlightForm, district: e.target.value })}
                        className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3 py-2 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Priority Order</label>
                      <input
                        type="number"
                        value={spotlightForm.priority}
                        onChange={(e) => setSpotlightForm({ ...spotlightForm, priority: Number(e.target.value) })}
                        className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3 py-2 outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddSpotlightOpen(false)}
                      className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold"
                    >
                      Create Banner
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. SUBVIEW: POLICY PAGES */}
      {subView === 'cms' && selectedCmsPage && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-2">
            <h4 className="font-bold text-xs text-[#002c11] uppercase tracking-wider mb-2">Policy Documents</h4>
            {cmsPages.map((page) => (
              <button
                key={page.id}
                onClick={() => setSelectedCmsPage(page)}
                className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                  selectedCmsPage.id === page.id
                    ? 'bg-[#002c11] text-white'
                    : 'text-[#414941] hover:bg-[#f0eded]'
                }`}
              >
                <span className="truncate">{page.title}</span>
                <span className="text-[10px] uppercase font-mono opacity-80">{page.category}</span>
              </button>
            ))}
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm text-[#002c11]">{selectedCmsPage.title}</h3>
              <button
                onClick={handleSaveCmsPage}
                className="px-4 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold rounded-xl"
              >
                Publish Document
              </button>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={selectedCmsPage.subtitle || ''}
                onChange={(e) => setSelectedCmsPage({ ...selectedCmsPage, subtitle: e.target.value })}
                className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-2.5 outline-none focus:border-[#1b6d24]"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Content Body (Markdown Supported)</label>
              <textarea
                rows={10}
                value={selectedCmsPage.content}
                onChange={(e) => setSelectedCmsPage({ ...selectedCmsPage, content: e.target.value })}
                className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-3 outline-none focus:border-[#1b6d24] font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. SUBVIEW: VERSION HISTORY */}
      {subView === 'history' && (
        <div className="bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-stone-100 pb-3">
            <h3 className="font-bold text-sm text-[#002c11]">CMS Audit &amp; Version History Log</h3>
            <span className="text-xs text-stone-500">{versionHistory.length} recorded modifications</span>
          </div>

          {versionHistory.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">No CMS modifications recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {versionHistory.map((v) => (
                <div key={v.id} className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/80 text-xs flex justify-between items-start">
                  <div>
                    <span className="font-bold text-[#002c11]">{v.changeDescription}</span>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Entity: <span className="font-mono">{v.entityType}/{v.entityId}</span> • Edited by: {v.changedByEmail}
                    </p>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {new Date(v.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
