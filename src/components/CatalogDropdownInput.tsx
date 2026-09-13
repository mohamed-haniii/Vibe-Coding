import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, X, Search, Sparkles } from 'lucide-react';
import { apiRequest } from '../api/client';

interface CatalogDropdownInputProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  catalogType?: 'operations' | 'medications';
  onCatalogUpdated?: () => void;
  colorScheme?: 'amber' | 'blue' | 'purple' | 'emerald';
}

export const CatalogDropdownInput: React.FC<CatalogDropdownInputProps> = ({
  value,
  onChange,
  options,
  placeholder = 'اكتب أو اختر من القائمة...',
  catalogType,
  onCatalogUpdated,
  colorScheme = 'amber'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Split current value into items to check which ones are selected
  const selectedItems = value
    ? value.split(/[,،\n]+/).map(s => s.trim()).filter(Boolean)
    : [];

  const handleSelectItem = (item: string) => {
    const trimmedItem = item.trim();
    if (!trimmedItem) return;

    if (selectedItems.includes(trimmedItem)) {
      // If already present, remove it
      const updated = selectedItems.filter(i => i !== trimmedItem);
      onChange(updated.join('، '));
    } else {
      // Append to the list
      const updated = [...selectedItems, trimmedItem];
      onChange(updated.join('، '));
    }
  };

  const handleAddNewToCatalog = async () => {
    if (!searchTerm.trim() || !catalogType) return;
    setIsAddingNew(true);
    try {
      await apiRequest(`/patients/catalogs/${catalogType}`, {
        method: 'POST',
        body: { name: searchTerm.trim() }
      });
      handleSelectItem(searchTerm.trim());
      setSearchTerm('');
      if (onCatalogUpdated) onCatalogUpdated();
    } catch (err) {
      console.error('Failed to add new item to catalog:', err);
    } finally {
      setIsAddingNew(false);
    }
  };

  // Filter options by search term
  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const borderFocusClasses = {
    amber: 'border-amber-300 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-500/20',
    blue: 'border-blue-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20',
    purple: 'border-purple-300 focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-500/20',
    emerald: 'border-emerald-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20'
  }[colorScheme];

  const arrowBgClasses = {
    amber: 'bg-amber-100/70 hover:bg-amber-200 text-amber-900 border-amber-300',
    blue: 'bg-blue-100/70 hover:bg-blue-200 text-blue-900 border-blue-300',
    purple: 'bg-purple-100/70 hover:bg-purple-200 text-purple-900 border-purple-300',
    emerald: 'bg-emerald-100/70 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
  }[colorScheme];

  const pillClasses = {
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200',
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200',
    emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
  }[colorScheme];

  const activePillClasses = {
    amber: 'bg-amber-600 text-white border-amber-600 shadow-xs font-bold',
    blue: 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold',
    purple: 'bg-purple-600 text-white border-purple-600 shadow-xs font-bold',
    emerald: 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
  }[colorScheme];

  return (
    <div className="relative w-full text-right" ref={containerRef}>
      {/* Input container with Arrow button */}
      <div className={`flex items-center w-full bg-white rounded-xl border transition-all shadow-2xs ${borderFocusClasses}`}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3.5 py-2.5 bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
        />

        {/* Clear Button if value exists */}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg cursor-pointer"
            title="مسح النص"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Dropdown Arrow Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 my-1 ml-1 rounded-lg text-xs font-bold border transition-all cursor-pointer select-none ${arrowBgClasses} ${isOpen ? 'ring-2 ring-amber-400/50' : ''}`}
          title="عرض واختيار من العناصر المسجلة سابقاً"
        >
          <span className="text-[11px] hidden sm:inline">اختر من المسجل</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
          
          {/* Dropdown Header & Search Filter */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>العناصر المسجلة سابقاً ({options.length})</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">اضغط لاختيار عنصر أو إضافته</span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث في القائمة أو كتابة اسم جديد..."
              className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-amber-500"
              autoFocus
            />
          </div>

          {/* List of Options */}
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = selectedItems.includes(opt.trim());
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectItem(opt)}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? activePillClasses
                        : 'hover:bg-slate-100 text-slate-800 font-semibold'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-3 text-xs text-slate-400">
                لا توجد عناصر مطابقة في القائمة
              </div>
            )}
          </div>

          {/* Add custom search term as new catalog entry button */}
          {searchTerm.trim() && !options.includes(searchTerm.trim()) && catalogType && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAddNewToCatalog}
                disabled={isAddingNew}
                className="w-full px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة «{searchTerm.trim()}» كعنصر دائم في القائمة</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
