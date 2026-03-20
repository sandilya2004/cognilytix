import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Plus, Trash2, Clock, ArrowLeft, FolderOpen, FolderPlus, ChevronRight, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface Project {
  id: string;
  folderId: string;
  name: string;
  fileName: string;
  createdAt: string;
  chartCount: number;
  projectNumber: number;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export function getFolders(): Folder[] {
  try { return JSON.parse(localStorage.getItem("cognilytix_folders") || "[]"); }
  catch { return []; }
}
export function saveFolders(folders: Folder[]) {
  localStorage.setItem("cognilytix_folders", JSON.stringify(folders));
}

export function getProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem("cognilytix_projects") || "[]"); }
  catch { return []; }
}
export function saveProjects(projects: Project[]) {
  localStorage.setItem("cognilytix_projects", JSON.stringify(projects));
}

export default function Projects() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);

  useEffect(() => {
    setFolders(getFolders());
    setProjects(getProjects());
  }, []);

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    const folder: Folder = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
    const updated = [folder, ...folders];
    saveFolders(updated);
    setFolders(updated);
    setNewFolderName("");
    setFolderDialogOpen(false);
  };

  const deleteFolder = (id: string) => {
    const updated = folders.filter(f => f.id !== id);
    saveFolders(updated);
    setFolders(updated);
    // Delete all projects in this folder
    const updatedProjects = projects.filter(p => p.folderId !== id);
    saveProjects(updatedProjects);
    setProjects(updatedProjects);
    updatedProjects.forEach(p => { if (p.folderId === id) localStorage.removeItem(`cognilytix_project_${p.id}`); });
    if (activeFolderId === id) setActiveFolderId(null);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    saveProjects(updated);
    setProjects(updated);
    localStorage.removeItem(`cognilytix_project_${id}`);
  };

  const folderProjects = activeFolderId ? projects.filter(p => p.folderId === activeFolderId) : [];
  const activeFolder = folders.find(f => f.id === activeFolderId);

  const createProjectInFolder = () => {
    if (!activeFolderId) return;
    const existingInFolder = projects.filter(p => p.folderId === activeFolderId);
    const nextNum = existingInFolder.length + 1;
    const projectId = crypto.randomUUID();
    navigate(`/dashboard?project=${projectId}&folder=${activeFolderId}&num=${nextNum}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => activeFolderId ? setActiveFolderId(null) : navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">
              {activeFolderId ? activeFolder?.name : "My Projects"}
            </span>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {!activeFolderId ? (
          /* Folder List */
          <>
            {folders.length === 0 ? (
              <div className="text-center py-20">
                <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No folders yet</h2>
                <p className="text-muted-foreground mb-6">Create a folder to organize your analysis projects.</p>
                <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero">
                      <FolderPlus className="h-4 w-4 mr-1" />
                      Create a Folder
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <Input placeholder="Folder name (e.g. Q1 Reports)" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === "Enter" && createFolder()} />
                      <Button className="w-full" onClick={createFolder}>Create</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-6">
                  <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
                    <DialogTrigger asChild>
                      <Button><FolderPlus className="h-4 w-4 mr-1" />New Folder</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        <Input placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === "Enter" && createFolder()} />
                        <Button className="w-full" onClick={createFolder}>Create</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {folders.map((folder, i) => {
                    const count = projects.filter(p => p.folderId === folder.id).length;
                    return (
                      <motion.div
                        key={folder.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-colors cursor-pointer group"
                        onClick={() => setActiveFolderId(folder.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FolderOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{folder.name}</h3>
                              <p className="text-xs text-muted-foreground">{count} project{count !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(folder.createdAt).toLocaleDateString()}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          /* Inside a folder — project list */
          <>
            {folderProjects.length === 0 ? (
              <div className="text-center py-20">
                <FileBarChart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No projects in this folder</h2>
                <p className="text-muted-foreground mb-6">Create a project to start analyzing data.</p>
                <Button variant="hero" onClick={createProjectInFolder}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Project
                </Button>
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-6">
                  <Button onClick={createProjectInFolder}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Project
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {folderProjects
                    .sort((a, b) => a.projectNumber - b.projectNumber)
                    .map((project, i) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/dashboard?project=${project.id}&folder=${activeFolderId}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-sm font-bold text-primary">
                              #{project.projectNumber}
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</h3>
                              <p className="text-xs text-muted-foreground">{project.fileName || "No data yet"}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); deleteProject(project.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(project.createdAt).toLocaleDateString()}</span>
                          <span>{project.chartCount} charts</span>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
