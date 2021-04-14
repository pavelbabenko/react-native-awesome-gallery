import * as React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createSharedElementStackNavigator } from 'react-navigation-shared-element';
import type { NavParams } from './types';
import { Home } from '../screens/Home';
import { Photos } from '../screens/Photos';

const Stack = createSharedElementStackNavigator<NavParams>();

export const Navigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen
          name="Photos"
          component={Photos}
          options={{
            cardStyleInterpolator: ({ current }) => ({
              cardStyle: {
                opacity: current.progress,
              },
            }),
            gestureEnabled: false,
          }}
          sharedElements={(route, _, showing) => {
            const { index } = route.params;
            if (Platform.OS !== 'ios' && !showing) {
              return [];
            }
            return [`${index}`];
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
