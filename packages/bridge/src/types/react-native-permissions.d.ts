declare module 'react-native-permissions' {
  import { Permission, PermissionStatus } from 'react-native';

  export const PERMISSIONS: {
    IOS: {
      CAMERA: Permission;
    };
    ANDROID: {
      CAMERA: Permission;
    };
  };

  export const RESULTS: {
    UNAVAILABLE: PermissionStatus;
    DENIED: PermissionStatus;
    LIMITED: PermissionStatus;
    GRANTED: PermissionStatus;
    BLOCKED: PermissionStatus;
  };

  export function check(permission: Permission): Promise<PermissionStatus>;
  export function request(permission: Permission): Promise<PermissionStatus>;
}


