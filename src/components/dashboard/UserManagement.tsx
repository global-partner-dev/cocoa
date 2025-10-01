import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, UserCheck, UserX, Filter, Download, FileText, RefreshCw, AlertTriangle } from "lucide-react";
import { UserRole } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  fetchAllUsers, 
  updateUserStatus, 
  deleteUser, 
  getDocumentDownloadUrl,
  UserWithDocuments,
  EvaluatorDocument 
} from "@/lib/userManagement";
import { useTranslation } from "react-i18next";

const UserManagement = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserWithDocuments[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithDocuments | null>(null);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [selectedUserDocuments, setSelectedUserDocuments] = useState<{ user: UserWithDocuments; documents: EvaluatorDocument[] } | null>(null);

  const filteredUsers = (roleFilter === 'all' 
    ? users 
    : users.filter(user => user.role === roleFilter))
    .filter(user => user.role !== 'admin');

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await fetchAllUsers();
      if (result.success && result.users) {
        setUsers(result.users);
      } else {
        toast({
          title: "Error",
          description: result.error || t('dashboard.userManagement.toasts.errors.loadUsers'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: t('dashboard.userManagement.toasts.errors.loadUsers'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: UserWithDocuments) => {
    const newStatus = !user.is_verified;
    
    try {
      const result = await updateUserStatus(user.id, newStatus);
      if (result.success) {
        // Update local state
        setUsers(users.map(u => 
          u.id === user.id 
            ? { ...u, is_verified: newStatus }
            : u
        ));
        
        toast({
          title: "Success",
          description: newStatus ? t('dashboard.userManagement.toasts.success.userActivated') : t('dashboard.userManagement.toasts.success.userDeactivated'),
        });
      } else {
        toast({
          title: "Error",
          description: result.error || t('dashboard.userManagement.toasts.errors.updateStatus'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: t('dashboard.userManagement.toasts.errors.updateStatus'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const result = await deleteUser(userToDelete.id);
      if (result.success) {
        // Remove user from local state
        setUsers(users.filter(u => u.id !== userToDelete.id));
        
        toast({
          title: "Success",
          description: t('dashboard.userManagement.toasts.success.userDeleted'),
        });
      } else {
        toast({
          title: "Error",
          description: result.error || t('dashboard.userManagement.toasts.errors.deleteUser'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: t('dashboard.userManagement.toasts.errors.deleteUser'),
        variant: "destructive",
      });
    } finally {
      closeDeleteDialog();
    }
  };

  const handleDownloadDocument = async (document: EvaluatorDocument) => {
    try {
      const result = await getDocumentDownloadUrl(document.file_path);
      if (result.success && result.url) {
        // Open download in new tab
        window.open(result.url, '_blank');
        
        toast({
          title: "Success",
          description: t('dashboard.userManagement.toasts.success.documentDownload'),
        });
      } else {
        toast({
          title: "Error",
          description: result.error || t('dashboard.userManagement.toasts.errors.getDownloadUrl'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: t('dashboard.userManagement.toasts.errors.downloadDocument'),
        variant: "destructive",
      });
    }
  };



  const openDeleteDialog = (user: UserWithDocuments) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const openDocumentsDialog = (user: UserWithDocuments) => {
    setSelectedUserDocuments({
      user,
      documents: user.documents || []
    });
    setDocumentsDialogOpen(true);
  };

  const closeDocumentsDialog = () => {
    setDocumentsDialogOpen(false);
    setSelectedUserDocuments(null);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      director: 'bg-blue-100 text-blue-800',
      judge: 'bg-green-100 text-green-800',
      participant: 'bg-yellow-100 text-yellow-800',
      evaluator: 'bg-purple-100 text-purple-800',
    };
    return colors[role];
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.userManagement.title')}</h2>
            <p className="text-muted-foreground">{t('dashboard.userManagement.loading')}</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-[hsl(var(--chocolate-medium))]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.userManagement.title')}</h2>
          <p className="text-muted-foreground">{t('dashboard.userManagement.description')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            className="flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('dashboard.userManagement.refresh')}</span>
          </Button>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t('dashboard.userManagement.filter.byRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.userManagement.filter.allRoles')}</SelectItem>
                <SelectItem value="director">{t('dashboard.userManagement.filter.directors')}</SelectItem>
                <SelectItem value="judge">{t('dashboard.userManagement.filter.judges')}</SelectItem>
                <SelectItem value="participant">{t('dashboard.userManagement.filter.participants')}</SelectItem>
                <SelectItem value="evaluator">{t('dashboard.userManagement.filter.evaluators')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[hsl(var(--golden-accent))] to-[hsl(var(--golden-light))] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-semibold text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[hsl(var(--chocolate-dark))] truncate">{user.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.userManagement.userInfo.joined')}: {formatDate(user.created_at)}
                    </p>
                    {user.phone && (
                      <p className="text-xs text-muted-foreground">{t('dashboard.userManagement.userInfo.phone')}: {user.phone}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`${getRoleBadgeColor(user.role)} capitalize text-xs`}>
                      {user.role}
                    </Badge>
                    
                    <Badge variant={user.is_verified ? 'default' : 'secondary'} className="text-xs">
                      {user.is_verified ? t('dashboard.userManagement.userInfo.active') : t('dashboard.userManagement.userInfo.inactive')}
                    </Badge>

                    {/* Show document count for evaluators */}
                    {user.role === 'evaluator' && user.documents && (
                      <Badge variant="outline" className="text-xs">
                        {user.documents.length} {t('dashboard.userManagement.userInfo.docs')}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* Document download button for evaluators */}
                    {user.role === 'evaluator' && user.documents && user.documents.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDocumentsDialog(user)}
                        className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm"
                      >
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">{t('dashboard.userManagement.actions.documents')}</span>
                        <span className="sm:hidden">Docs</span>
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleUserStatus(user)}
                      className={`text-xs sm:text-sm ${user.is_verified ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}`}
                    >
                      {user.is_verified ? (
                        <>
                          <UserX className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          <span className="hidden sm:inline">{t('dashboard.userManagement.actions.deactivate')}</span>
                          <span className="sm:hidden">Deactivate</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          <span className="hidden sm:inline">{t('dashboard.userManagement.actions.activate')}</span>
                          <span className="sm:hidden">Activate</span>
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(user)}
                      className="text-red-600 hover:text-red-700 text-xs sm:text-sm"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">{t('dashboard.userManagement.actions.delete')}</span>
                      <span className="sm:hidden">Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">{t('dashboard.userManagement.noUsers')}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
        {userToDelete && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span>{t('dashboard.userManagement.deleteDialog.title')}</span>
              </DialogTitle>
              <DialogDescription>
                {t('dashboard.userManagement.deleteDialog.description', { userName: userToDelete.name })}
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{t('dashboard.userManagement.deleteDialog.items.userAccount')}</li>
                  <li>{t('dashboard.userManagement.deleteDialog.items.associatedData')}</li>
                  {userToDelete.role === 'evaluator' && userToDelete.documents && userToDelete.documents.length > 0 && (
                    <li>{t('dashboard.userManagement.deleteDialog.items.uploadedDocuments', { count: userToDelete.documents.length })}</li>
                  )}
                </ul>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={closeDeleteDialog}>
                {t('dashboard.userManagement.deleteDialog.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                {t('dashboard.userManagement.deleteDialog.deleteUser')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Documents Dialog */}
      <Dialog open={documentsDialogOpen} onOpenChange={(open) => !open && closeDocumentsDialog()}>
        <DialogContent className="max-w-4xl mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {t('dashboard.userManagement.documentsDialog.title', { userName: selectedUserDocuments?.user.name })}
            </DialogTitle>
            <DialogDescription>
              {t('dashboard.userManagement.documentsDialog.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {selectedUserDocuments?.documents.map((document) => (
              <Card key={document.id}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--chocolate-medium))] flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{document.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(document.file_size)} • {document.file_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('dashboard.userManagement.documentsDialog.uploaded')}: {formatDate(document.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(document)}
                        className="text-xs sm:text-sm"
                      >
                        <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {t('dashboard.userManagement.documentsDialog.download')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {selectedUserDocuments?.documents.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('dashboard.userManagement.documentsDialog.noDocuments')}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={closeDocumentsDialog} className="w-full sm:w-auto">
              {t('dashboard.userManagement.documentsDialog.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;