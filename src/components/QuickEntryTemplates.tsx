import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmotionEntry, SensoryEntry } from '@/types/student';
import { Sparkles, Zap, Brain, Clock, Sun, Moon, RefreshCw, Plus, X, Trash2, Edit, Star } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface QuickTemplate {
  id: string;
  name: string;
  description: string;
  category: 'morning' | 'transition' | 'learning' | 'break' | 'afternoon' | 'custom';
  emotions: Partial<EmotionEntry>[];
  sensoryInputs: Partial<SensoryEntry>[];
  isDefault: boolean;
  usageCount: number;
  lastUsed?: Date;
}

interface QuickEntryTemplatesProps {
  studentId: string;
  onApplyTemplate: (emotions: Partial<EmotionEntry>[], sensoryInputs: Partial<SensoryEntry>[]) => void;
}

const defaultTemplates: QuickTemplate[] = [
  {
    id: 'morning-routine',
    name: 'Morning Arrival',
    description: 'Standard morning check-in for classroom entry',
    category: 'morning',
    emotions: [
      { emotion: 'calm', intensity: 3 },
      { emotion: 'excited', intensity: 2 }
    ],
    sensoryInputs: [
      { sensoryType: 'visual', response: 'neutral', intensity: 2 },
      { sensoryType: 'auditory', response: 'seeking', intensity: 3 }
    ],
    isDefault: true,
    usageCount: 0
  },
  {
    id: 'transition-stress',
    name: 'Transition Difficulty',
    description: 'Quick entry for challenging transitions',
    category: 'transition',
    emotions: [
      { emotion: 'anxious', intensity: 4 },
      { emotion: 'angry', intensity: 3 }
    ],
    sensoryInputs: [
      { sensoryType: 'auditory', response: 'avoiding', intensity: 4 },
      { sensoryType: 'tactile', response: 'seeking', intensity: 4 }
    ],
    isDefault: true,
    usageCount: 0
  },
  {
    id: 'focused-learning',
    name: 'Engaged Learning',
    description: 'Positive learning engagement state',
    category: 'learning',
    emotions: [
      { emotion: 'calm', intensity: 4 },
      { emotion: 'excited', intensity: 3 }
    ],
    sensoryInputs: [
      { sensoryType: 'visual', response: 'seeking', intensity: 3 },
      { sensoryType: 'proprioceptive', response: 'neutral', intensity: 2 }
    ],
    isDefault: true,
    usageCount: 0
  },
  {
    id: 'sensory-break',
    name: 'Sensory Break',
    description: 'During or after sensory regulation break',
    category: 'break',
    emotions: [
      { emotion: 'calm', intensity: 4 }
    ],
    sensoryInputs: [
      { sensoryType: 'proprioceptive', response: 'seeking', intensity: 4 },
      { sensoryType: 'vestibular', response: 'seeking', intensity: 3 }
    ],
    isDefault: true,
    usageCount: 0
  },
  {
    id: 'afternoon-fatigue',
    name: 'Afternoon Fatigue',
    description: 'End-of-day tiredness and regulation',
    category: 'afternoon',
    emotions: [
      { emotion: 'sad', intensity: 2 },
      { emotion: 'calm', intensity: 2 }
    ],
    sensoryInputs: [
      { sensoryType: 'auditory', response: 'avoiding', intensity: 3 },
      { sensoryType: 'visual', response: 'avoiding', intensity: 2 }
    ],
    isDefault: true,
    usageCount: 0
  }
];

/**
 * QuickEntryTemplates Component
 * 
 * Provides pre-configured templates for quick emotion and sensory input entries.
 * Templates are persisted per student in localStorage for convenience.
 * 
 * @component
 * @param {QuickEntryTemplatesProps} props - Component props
 * @param {string} props.studentId - ID of the current student
 * @param {Function} props.onApplyTemplate - Callback when a template is applied
 */
export const QuickEntryTemplates: React.FC<QuickEntryTemplatesProps> = ({
  studentId,
  onApplyTemplate
}) => {
  /**
   * Initialize templates from localStorage with error handling.
   * Falls back to default templates if parsing fails or data is corrupted.
   */
  const [templates, setTemplates] = useState<QuickTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(`quickTemplates_${studentId}`);
      if (!saved) return defaultTemplates;
      
      // Attempt to parse saved templates
      const parsed = JSON.parse(saved);
      
      // Validate that parsed data is an array
      if (!Array.isArray(parsed)) {
        logger.warn('Invalid template data in localStorage, using defaults', { studentId });
        return defaultTemplates;
      }
      
      // Basic validation of template structure
      const isValidTemplate = (t: unknown): t is QuickTemplate => {
        return t && 
               typeof t.id === 'string' && 
               typeof t.name === 'string' &&
               Array.isArray(t.emotions) &&
               Array.isArray(t.sensoryInputs);
      };
      
      // Filter out invalid templates
      const validTemplates = parsed.filter(isValidTemplate);
      
      // If no valid templates found, return defaults
      if (validTemplates.length === 0) {
        logger.warn('No valid templates found in localStorage, using defaults', { studentId });
        return defaultTemplates;
      }
      
      return validTemplates;
    } catch (error) {
      // Log error and fall back to defaults
      logger.error('Failed to parse saved templates, using defaults', error);
      return defaultTemplates;
    }
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuickTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<QuickTemplate>>({
    name: '',
    description: '',
    category: 'custom',
    emotions: [],
    sensoryInputs: [],
    isDefault: false,
    usageCount: 0
  });

  /**
   * Save templates to localStorage with error handling.
   * Logs errors but doesn't crash the application if saving fails.
   * 
   * @param {QuickTemplate[]} updatedTemplates - Templates to save
   */
  const saveTemplates = (updatedTemplates: QuickTemplate[]) => {
    setTemplates(updatedTemplates);
    try {
      localStorage.setItem(`quickTemplates_${studentId}`, JSON.stringify(updatedTemplates));
    } catch (error) {
      // Handle quota exceeded or other storage errors
      logger.error('Failed to save templates to localStorage', error);
      toast.error('Failed to save template changes. Storage may be full.');
    }
  };

  const applyTemplate = (template: QuickTemplate) => {
    // Add student ID to entries
    const emotions = template.emotions.map(emotion => ({
      ...emotion,
      studentId,
      id: `temp_${Date.now()}_${Math.random()}`,
      timestamp: new Date()
    }));
    
    const sensoryInputs = template.sensoryInputs.map(sensory => ({
      ...sensory,
      studentId,
      id: `temp_${Date.now()}_${Math.random()}`,
      timestamp: new Date()
    }));

    // Update usage statistics
    const updatedTemplates = templates.map(t => 
      t.id === template.id 
        ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date() }
        : t
    );
    saveTemplates(updatedTemplates);

    onApplyTemplate(emotions, sensoryInputs);
    toast.success(`Applied template: ${template.name}`);
  };

  const deleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template?.isDefault) {
      toast.error("Cannot delete default templates");
      return;
    }
    
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    saveTemplates(updatedTemplates);
    toast.success("Template deleted");
  };

  const createTemplate = () => {
    if (!newTemplate.name?.trim()) {
      toast.error("Template name is required");
      return;
    }

    const template: QuickTemplate = {
      id: `custom_${Date.now()}`,
      name: newTemplate.name!,
      description: newTemplate.description || '',
      category: (newTemplate.category as "morning" | "transition" | "learning" | "break" | "afternoon" | "custom") || 'custom',
      emotions: newTemplate.emotions || [],
      sensoryInputs: newTemplate.sensoryInputs || [],
      isDefault: false,
      usageCount: 0
    };

    const updatedTemplates = [...templates, template];
    saveTemplates(updatedTemplates);
    setNewTemplate({
      name: '',
      description: '',
      category: 'custom',
      emotions: [],
      sensoryInputs: [],
      isDefault: false,
      usageCount: 0
    });
    setIsCreating(false);
    toast.success("Template created successfully");
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'morning': return 'bg-gradient-to-r from-yellow-400 to-orange-400';
      case 'transition': return 'bg-gradient-to-r from-red-400 to-pink-400';
      case 'learning': return 'bg-gradient-to-r from-blue-400 to-indigo-400';
      case 'break': return 'bg-gradient-to-r from-green-400 to-teal-400';
      case 'afternoon': return 'bg-gradient-to-r from-purple-400 to-indigo-400';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };

  const sortedTemplates = [...templates].sort((a, b) => {
    // Sort by: 1) Most used, 2) Most recently used, 3) Default first, 4) Name
    if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
    if (a.lastUsed && b.lastUsed) return b.lastUsed.getTime() - a.lastUsed.getTime();
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Card className="bg-gradient-card border-0 shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Entry Templates
          </CardTitle>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Quick Entry Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Template Name</label>
                  <Input
                    placeholder="e.g., Sensory Overload Response"
                    value={newTemplate.name || ''}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Brief description of when to use this template"
                    value={newTemplate.description || ''}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value as "morning" | "transition" | "learning" | "break" | "afternoon" | "custom" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="transition">Transition</SelectItem>
                      <SelectItem value="learning">Learning</SelectItem>
                      <SelectItem value="break">Break</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createTemplate}>
                    Create Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTemplates.map((template) => (
            <Card key={template.id} className="relative overflow-hidden border-border/50 hover:shadow-md transition-shadow">
              {template.usageCount > 0 && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-xs text-muted-foreground">{template.usageCount}</span>
                </div>
              )}
              
              <div className={`h-2 ${getCategoryColor(template.category)}`} />
              
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm">{template.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <Badge variant="outline" className="text-xs capitalize">
                        {template.category}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {template.emotions.slice(0, 2).map((emotion, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {emotion.emotion} ({emotion.intensity})
                        </Badge>
                      ))}
                      {template.emotions.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.emotions.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      size="sm"
                      onClick={() => applyTemplate(template)}
                      className="flex-1 mr-2"
                    >
                      Apply Template
                    </Button>
                    
                    {!template.isDefault && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No quick entry templates yet</p>
            <p className="text-sm">Create templates for common tracking scenarios</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};