import { ReactNode } from 'react';
import { TableIcon, BoardIcon, TimelineIcon, CalendarIcon, ListIcon, GalleryIcon, ChartIcon, FeedIcon, MapIcon, DashboardIcon } from '@/components/svg';

export type DataLayout =
  | 'table'
  | 'board'
  | 'timeline'
  | 'calendar'
  | 'list'
  | 'gallery'
  | 'chart'
  | 'feed'
  | 'map'
  | 'dashboard';

export type LayoutOption = {
  id: DataLayout;
  label: string;
  icon: ReactNode;
};

export const layoutOptions: LayoutOption[] = [
  { id: 'table', label: 'Table', icon: <TableIcon /> },
  { id: 'board', label: 'Board', icon: <BoardIcon /> },
  // { id: 'timeline', label: 'Timeline', icon: <TimelineIcon /> },
  // { id: 'calendar', label: 'Calendar', icon: <CalendarIcon /> },
  { id: 'list', label: 'List', icon: <ListIcon /> },
  // { id: 'gallery', label: 'Gallery', icon: <GalleryIcon /> },
  // { id: 'chart', label: 'Chart', icon: <ChartIcon /> },
  // { id: 'feed', label: 'Feed', icon: <FeedIcon /> },
  // { id: 'map', label: 'Map', icon: <MapIcon /> },
  // { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
];