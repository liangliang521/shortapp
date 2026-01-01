import React from 'react';
import { AppRegistry } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DevMenuBottomSheet from './DevMenuBottomSheet';
import { DevMenuView } from './DevMenuView';

class DevMenuRoot extends React.PureComponent<
  { task: { manifestUrl: string; manifestString: string }; uuid: string },
  any
> {
  render() {
    return <DevMenuApp {...this.props} />;
  }
}

function DevMenuApp(props: {
  task: { manifestUrl: string; manifestString: string };
  uuid: string;
}) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DevMenuBottomSheet uuid={props.uuid}>
          <DevMenuView {...props} />
        </DevMenuBottomSheet>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

AppRegistry.registerComponent('HomeMenu', () => DevMenuRoot);
