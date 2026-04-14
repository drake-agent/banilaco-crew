/**
 * Mock video performance fixtures for the creator content page.
 *
 * This is a true fixture: there is no `/api/content` endpoint yet,
 * so the UI renders static demo data. When the real endpoint lands,
 * replace consumers with `useApi<Video[]>('content')` and delete this file.
 */

export interface Video {
  id: string;
  title: string;
  type: 'Routine' | 'ASMR' | 'Review' | 'GRWM' | 'Haul';
  views: number;
  gmv: number;
  ctr: number;
  cvr: number;
  posted: string;
  status: 'top' | 'good' | 'average' | 'below';
}

export const mockVideos: Video[] = [
  {
    id: '1',
    title: 'Morning Routine with banila co',
    type: 'Routine',
    views: 45000,
    gmv: 1850,
    ctr: 4.2,
    cvr: 2.8,
    posted: 'Mar 22',
    status: 'top',
  },
  {
    id: '2',
    title: 'ASMR Unboxing K-beauty Set',
    type: 'ASMR',
    views: 31000,
    gmv: 1250,
    ctr: 3.8,
    cvr: 2.1,
    posted: 'Mar 15',
    status: 'good',
  },
  {
    id: '3',
    title: 'Honest Review: Clean It Zero',
    type: 'Review',
    views: 28000,
    gmv: 980,
    ctr: 3.1,
    cvr: 1.9,
    posted: 'Mar 18',
    status: 'average',
  },
  {
    id: '4',
    title: 'GRWM for Date Night',
    type: 'GRWM',
    views: 18500,
    gmv: 580,
    ctr: 2.5,
    cvr: 1.4,
    posted: 'Mar 10',
    status: 'below',
  },
  {
    id: '5',
    title: 'K-beauty Haul Under $30',
    type: 'Haul',
    views: 12000,
    gmv: 320,
    ctr: 2.1,
    cvr: 1.1,
    posted: 'Mar 5',
    status: 'below',
  },
];
