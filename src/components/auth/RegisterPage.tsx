import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, X } from "lucide-react";

const RegisterPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "" as UserRole,
    password: "",
    confirmPassword: "",
  });
  
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: t('auth.register.toasts.invalidFileTypeTitle'),
          description: t('auth.register.toasts.invalidFileTypeDesc'),
          variant: "destructive",
        });
        return false;
      }
      
      if (file.size > maxSize) {
        toast({
          title: t('auth.register.toasts.fileTooLargeTitle'),
          description: t('auth.register.toasts.fileTooLargeDesc'),
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    setUploadedDocuments(prev => [...prev, ...validFiles]);
    
    if (validFiles.length > 0) {
      toast({
        title: t('auth.register.toasts.documentsUploadedTitle'),
        description: t('auth.register.toasts.documentsUploadedDesc', { count: validFiles.length }),
      });
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
    toast({
      title: t('auth.register.toasts.documentRemovedTitle'),
      description: t('auth.register.toasts.documentRemovedDesc'),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t('auth.register.toasts.passwordsNoMatchTitle'),
        description: t('auth.register.toasts.passwordsNoMatchDesc'),
        variant: "destructive",
      });
      return;
    }

    if (!formData.role) {
      toast({
        title: t('auth.register.toasts.selectRoleTitle'),
        description: t('auth.register.toasts.selectRoleDesc'),
        variant: "destructive",
      });
      return;
    }

    // Validate evaluator documents
    if (formData.role === "evaluator" && uploadedDocuments.length === 0) {
      toast({
        title: t('auth.register.toasts.documentsRequiredTitle'),
        description: t('auth.register.toasts.documentsRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        password: formData.password,
      }, uploadedDocuments);

      if (result.success) {
        let successMessage = t('auth.register.toasts.registrationCompleteDesc');
        
        if (result.needsApproval) {
          if (formData.role === "evaluator") {
            successMessage = t('auth.register.toasts.registrationCompleteEvaluatorDesc');
          } else {
            successMessage = t('auth.register.toasts.registrationCompleteApprovalDesc');
          }
        }
        
        toast({
          title: t('auth.register.toasts.registrationCompleteTitle'),
          description: successMessage,
        });
        
        // Don't navigate to dashboard - user needs approval first
        navigate("/login");
      } else {
        toast({
          title: t('auth.register.toasts.registrationFailedTitle'),
          description: result.error || t('auth.register.toasts.registrationFailedDesc'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: t('auth.register.toasts.errorTitle'),
        description: t('auth.register.toasts.errorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 pt-20 bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--secondary))]">
      <Card className="w-full max-w-md shadow-[var(--shadow-chocolate)]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
            {t('auth.register.title')}
          </CardTitle>
          <CardDescription>
            {t('auth.register.subtitle')}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.register.fullName')}</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.register.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('auth.register.emailPlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('auth.register.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t('auth.register.role')}</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('auth.register.rolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('auth.register.roles.admin')}</SelectItem>
                  <SelectItem value="director">{t('auth.register.roles.director')}</SelectItem>
                  <SelectItem value="judge">{t('auth.register.roles.judge')}</SelectItem>
                  <SelectItem value="participant">{t('auth.register.roles.participant')}</SelectItem>
                  <SelectItem value="evaluator">{t('auth.register.roles.evaluator')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Document Upload for Evaluators */}
            {formData.role === "evaluator" && (
              <div className="space-y-3 p-4 bg-[hsl(var(--secondary))] rounded-lg border">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-[hsl(var(--chocolate-medium))]" />
                  <Label className="text-sm font-medium">{t('auth.register.evaluatorCredentials')}</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('auth.register.evaluatorCredentialsDesc')}
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="document-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">{t('auth.register.clickToUpload')}</span> {t('auth.register.dragAndDrop')}
                        </p>
                        <p className="text-xs text-gray-500">{t('auth.register.fileTypes')}</p>
                      </div>
                      <input
                        id="document-upload"
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleDocumentUpload}
                      />
                    </label>
                  </div>

                  {/* Uploaded Documents List */}
                  {uploadedDocuments.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('auth.register.uploadedDocuments')}</Label>
                      {uploadedDocuments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white rounded border"
                        >
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-[hsl(var(--chocolate-medium))]" />
                            <span className="text-sm truncate max-w-48">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(index)}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.register.password')}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('auth.register.passwordPlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.register.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" variant="chocolate" disabled={isSubmitting}>
              {isSubmitting ? t('auth.register.creatingAccount') : t('auth.register.createAccount')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.register.hasAccount')}{" "}
              <Link to="/login" className="text-[hsl(var(--golden-accent))] hover:underline font-medium">
                {t('auth.register.signIn')}
              </Link>
            </p>
          </div>


        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;