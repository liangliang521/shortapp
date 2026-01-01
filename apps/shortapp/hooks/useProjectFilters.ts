import { useState, useMemo } from 'react';
import { Project } from '@vibecoding/api-client/src/types';

interface UseProjectFiltersState {
  searchText: string;
  sortOrder: 'newest' | 'oldest';
}

interface UseProjectFiltersReturn extends UseProjectFiltersState {
  filteredProjects: Project[];
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
  setSortOrder: React.Dispatch<React.SetStateAction<'newest' | 'oldest'>>;
  toggleSortOrder: () => void;
}

export function useProjectFilters(projects: Project[]): UseProjectFiltersReturn {
  const [searchText, setSearchText] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const filteredProjects = useMemo(() => {
    if (!projects || !Array.isArray(projects)) {
      return [];
    }

    let filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchText.toLowerCase())) ||
      project.type.toLowerCase().includes(searchText.toLowerCase())
    );

    // Sort by created time
    filtered.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

    return filtered;
  }, [projects, searchText, sortOrder]);

  const toggleSortOrder = () => {
    (setSortOrder as React.Dispatch<React.SetStateAction<'newest' | 'oldest'>>)(prev => prev === 'newest' ? 'oldest' : 'newest');
  };

  return {
    searchText,
    sortOrder,
    filteredProjects,
    setSearchText,
    setSortOrder,
    toggleSortOrder,
  };
}
