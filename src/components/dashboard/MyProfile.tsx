import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";

const MyProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Profile fields
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return null;

  const isDemoUser = user.id.startsWith("demo-");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          phone: phone ? phone.trim() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: t('myProfile.toasts.profileUpdatedTitle'),
        description: t('myProfile.toasts.profileUpdatedDesc'),
      });
    } catch (err: any) {
      console.error("Failed to update profile", err);
      toast({
        variant: "destructive",
        title: t('myProfile.toasts.updateFailedTitle'),
        description: err?.message || t('common.tryAgain'),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const validatePassword = (pwd: string) => {
    // Basic strength: 8+ chars, upper, lower, number
    const rules = [
      { test: /.{8,}/, msg: t('myProfile.password.validation.min') },
      { test: /[a-z]/, msg: t('myProfile.password.validation.lower') },
      { test: /[A-Z]/, msg: t('myProfile.password.validation.upper') },
      { test: /\d/, msg: t('myProfile.password.validation.number') },
    ];
    const failed = rules.filter(r => !r.test.test(pwd)).map(r => r.msg);
    return { ok: failed.length === 0, failed };
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemoUser) {
      toast({
        variant: "destructive",
        title: t('myProfile.toasts.demoUnavailableTitle'),
        description: t('myProfile.toasts.demoUnavailableDesc'),
      });
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast({ variant: "destructive", title: t('myProfile.toasts.missingFieldsTitle'), description: t('myProfile.toasts.missingFieldsDesc') });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: t('myProfile.toasts.passwordsNoMatchTitle'), description: t('myProfile.toasts.passwordsNoMatchDesc') });
      return;
    }

    const { ok, failed } = validatePassword(newPassword);
    if (!ok) {
      toast({ variant: "destructive", title: t('myProfile.toasts.weakPasswordTitle'), description: failed.join(', ') });
      return;
    }

    try {
      setSavingPassword(true);
      // Optional: verify current password by attempting sign-in silently
      if (currentPassword) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (verifyError) {
          toast({ variant: "destructive", title: t('myProfile.toasts.currentPasswordIncorrectTitle'), description: t('common.tryAgain') });
          setSavingPassword(false);
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({ title: t('myProfile.toasts.passwordUpdatedTitle'), description: t('myProfile.toasts.passwordUpdatedDesc') });
    } catch (err: any) {
      console.error("Failed to change password", err);
      toast({ variant: "destructive", title: t('myProfile.toasts.passwordUpdateFailedTitle'), description: err?.message || t('common.tryAgain') });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-[hsl(var(--chocolate-dark))]">{t('myProfile.header.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="email">{t('myProfile.form.email')}</Label>
              <Input id="email" value={user.email} disabled />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">{t('myProfile.form.role')}</Label>
              <Input id="role" value={user.role} disabled className="capitalize" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">{t('myProfile.form.fullName')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('myProfile.form.fullNamePh')}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">{t('myProfile.form.phone')}</Label>
              <Input
                id="phone"
                value={phone ?? ""}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('myProfile.form.phonePh')}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? t('common.saving') : t('myProfile.actions.saveChanges')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[hsl(var(--chocolate-dark))]">{t('myProfile.password.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">{t('myProfile.password.current')}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('myProfile.password.currentPh')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="newPassword">{t('myProfile.password.new')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('myProfile.password.newPh')}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">{t('myProfile.password.confirm')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingPassword || isDemoUser}>
                {isDemoUser ? t('myProfile.password.demoUnavailable') : savingPassword ? t('myProfile.password.updating') : t('myProfile.password.update')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyProfile;