declare module 'react-native-tracking-transparency' {
  export type TrackingStatus = 
    | 'not-determined'
    | 'restricted'
    | 'denied'
    | 'authorized';

  export function requestTrackingPermission(): Promise<TrackingStatus>;
  export function getTrackingStatus(): Promise<TrackingStatus>;
}

