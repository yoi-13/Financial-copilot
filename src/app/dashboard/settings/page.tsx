'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/components/toast-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ListSkeleton } from '@/components/ui/skeleton';
import { compressImage } from '@/lib/compress-image';
import { saveSettings, changePassword, clearAllData } from '@/lib/actions';
import { Settings, Moon, Sun, Upload, Download, Trash2, Key, Plus, X, Image as ImageIcon } from 'lucide-react';


export default function SettingsPage() {
  const { toast } = useToast();
  const { dark, toggle } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('RM');
  const [saleTypes, setSaleTypes] = useState<string[]>(['Cash', 'QR', 'Account Transfer', 'Card', 'E-hailing']);
  const [newSaleType, setNewSaleType] = useState('');
  const [pdfIncludeInv, setPdfIncludeInv] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('user_settings').select('*').maybeSingle();
      if (data) {
        setSettings(data);
        setBusinessName(data.business_name || '');
        setCurrency(data.currency || 'RM');
        setSaleTypes((data.sale_types as string[]) || ['Cash', 'QR', 'Account Transfer', 'Card', 'E-hailing']);
        setPdfIncludeInv(data.pdf_include_inventory ?? true);
        setLogoPreview(data.logo_url || '');
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = settings?.logo_url || '';
      if (logoFile) {
        const compressed = await compressImage(logoFile, 400, 0.8);
        const { data: { user } } = await supabase.auth.getUser();
        const path = `logos/${user?.id}.jpg`;
        const { data: upload, error: uploadErr } = await supabase.storage.from('receipts').upload(path, compressed, { upsert: true });
        if (uploadErr) throw new Error('Logo upload failed: ' + uploadErr.message);
        if (upload) {
          const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path);
          logoUrl = publicUrl;
        }
      }
      await saveSettings({
        business_name: businessName,
        currency,
        sale_types: saleTypes,
        pdf_include_inventory: pdfIncludeInv,
        logo_url: logoUrl,
      });
      setLogoFile(null);
      toast('Settings saved.', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    }
    setSaving(false);
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    if (newPassword.length < 6) { setPwdMsg('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPwdMsg('Passwords do not match.'); return; }
    setPwdSaving(true);
    try {
      await changePassword(newPassword);
      setPwdMsg('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      toast('Password changed.', 'success');
    } catch (err: any) {
      setPwdMsg(err.message);
    }
    setPwdSaving(false);
  };

  const handleClearData = async () => {
    setClearing(true);
    try {
      await clearAllData();
      setConfirmClear(false);
      toast('All data cleared.', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    }
    setClearing(false);
  };

  const addSaleType = () => {
    const t = newSaleType.trim();
    if (!t || saleTypes.includes(t)) return;
    setSaleTypes(prev => [...prev, t]);
    setNewSaleType('');
  };

  const removeSaleType = (t: string) => setSaleTypes(prev => prev.filter(x => x !== t));

  const csvExport = async (table: string, filename: string) => {
    const { data } = await supabase.from(table as any).select('*');
    if (!data || data.length === 0) { toast('No data to export.', 'info'); return; }
    const headers = Object.keys(data[0]).filter(k => k !== 'user_id');
    const rows = data.map((row: any) => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`${filename}.csv downloaded.`, 'success');
  };

  if (loading) return (
    <div className="space-y-6 max-w-[640px]">
      <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />Settings
      </h1>
      <ListSkeleton rows={6} />
    </div>
  );

  return (
    <div className="space-y-8 max-w-[640px] pb-12">
      <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        Settings
      </h1>

      {/* Business Profile */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Business Profile</h2>
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Business Name</label>
              <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your business name" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Currency Symbol</label>
              <Input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="RM" className="w-24" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Logo</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-[8px] border text-sm cursor-pointer hover:bg-muted transition-colors">
                  <Upload className="h-4 w-4" />
                  {logoFile ? logoFile.name : 'Upload logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }
                  }} />
                </label>
                {(logoPreview || logoFile) && (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo" className="h-10 w-10 object-contain rounded-[6px] border" />
                    <button
                      onClick={() => { setLogoFile(null); setLogoPreview(''); }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center border-none cursor-pointer"
                    ><X className="h-3 w-3" /></button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sales Configuration */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Sales Configuration</h2>
        <Card>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">Payment types shown in the closing wizard.</p>
            <div className="flex flex-wrap gap-2">
              {saleTypes.map(t => (
                <Badge key={t} variant="secondary" className="gap-1 text-xs">
                  {t}
                  <button onClick={() => removeSaleType(t)} className="bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground p-0 ml-1"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Add type" value={newSaleType} onChange={e => setNewSaleType(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSaleType(); } }} />
              <Button variant="outline" size="sm" onClick={addSaleType}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* PDF Defaults */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">PDF Defaults</h2>
        <Card>
          <CardContent className="p-5 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={pdfIncludeInv} onChange={e => setPdfIncludeInv(e.target.checked)} className="w-4 h-4 rounded-[4px] border-border accent-primary" />
              <span className="text-sm">Include inventory snapshot in PDF by default</span>
            </label>
          </CardContent>
        </Card>
      </section>

      {/* Theme */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Appearance</h2>
        <Card>
          <CardContent className="p-5">
            <button onClick={toggle} className="flex items-center gap-3 w-full bg-transparent border-none cursor-pointer text-left">
              <div className="w-9 h-9 rounded-[8px] bg-muted flex items-center justify-center">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </div>
              <div>
                <div className="text-sm font-medium">{dark ? 'Light Mode' : 'Dark Mode'}</div>
                <div className="text-xs text-muted-foreground">Switch to {dark ? 'light' : 'dark'} theme</div>
              </div>
            </button>
          </CardContent>
        </Card>
      </section>

      {/* Account */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Account</h2>
        <Card>
          <CardContent className="p-5 space-y-4">
            <form onSubmit={handlePassword} className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />Change Password
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                <Input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={pwdSaving} size="sm">{pwdSaving ? 'Updating...' : 'Update Password'}</Button>
              {pwdMsg && <div className={`text-sm ${pwdMsg.includes('successfully') ? 'text-green' : 'text-destructive'}`}>{pwdMsg}</div>}
            </form>
          </CardContent>
        </Card>
      </section>

      {/* Data */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Data</h2>
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" />Export Data (CSV)
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => csvExport('inventory_items', 'inventory')}>Inventory</Button>
              <Button variant="outline" size="sm" onClick={() => csvExport('expenses', 'expenses')}>Expenses</Button>
              <Button variant="outline" size="sm" onClick={() => csvExport('daily_sales', 'sales')}>Sales</Button>
              <Button variant="outline" size="sm" onClick={() => csvExport('daily_reports', 'reports')}>Reports</Button>
            </div>
            <Separator />
            <div className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />Danger Zone
            </div>
            {!confirmClear ? (
              <Button variant="outline" size="sm" className="text-destructive border-destructive" onClick={() => setConfirmClear(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />Clear All Data
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive font-medium">This will permanently delete all your inventory, expenses, sales, and reports. This action cannot be undone.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handleClearData} disabled={clearing}>{clearing ? 'Clearing...' : 'Confirm — Delete Everything'}</Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmClear(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? 'Saving...' : 'Save Settings'}</Button>
    </div>
  );
}
