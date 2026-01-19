import React from 'react';
import { Palette, Bot, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SettingsTab = 'appearance' | 'ai' | 'audio';

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'audio', label: 'Audio & TTS', icon: Volume2 },
  ] as const;

  return (
    <div className="w-64 border-r border-border bg-card h-full flex flex-col">
      <div className="p-6">
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as SettingsTab)}
              data-active={isActive}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SettingsSidebar;
