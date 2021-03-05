import * as React from 'react';

import {
  Dimensions,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import AwesomeGallery, { RenderImageInfo } from 'react-native-awesome-gallery';
import FastImage from 'react-native-fast-image';
import {
  NavigationContainer,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  createSharedElementStackNavigator,
  SharedElement,
} from 'react-navigation-shared-element';
import { useCallback } from 'react';

const { height: screenHeight } = Dimensions.get('window');

const getRandomSize = function () {
  const min = 1000;
  const max = 2000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const images = new Array(10)
  .fill(0)
  .map(() => `https://picsum.photos/${getRandomSize()}/${getRandomSize()}`);

const renderImage = ({ index, uri, setImageDimensions }: RenderImageInfo) => {
  return (
    <SharedElement id={`${index}`} style={StyleSheet.absoluteFillObject}>
      <FastImage
        source={{ uri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode={FastImage.resizeMode.contain}
        onLoad={(e) => {
          const { width, height } = e.nativeEvent;
          setImageDimensions({ width, height });
        }}
      />
    </SharedElement>
  );
};

type NavParams = {
  Home: undefined;
  Photos: { index: number };
};

const Stack = createSharedElementStackNavigator<NavParams>();

const Home = () => {
  const { navigate } = useNavigation();

  return (
    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
      {images.map((uri, index) => (
        <TouchableWithoutFeedback
          key={uri}
          onPress={() => navigate('Photos', { index })}
        >
          <SharedElement
            id={`${index}`}
            style={{ width: '50%', height: (screenHeight / images.length) * 2 }}
          >
            <FastImage source={{ uri }} style={StyleSheet.absoluteFillObject} />
          </SharedElement>
        </TouchableWithoutFeedback>
      ))}
    </View>
  );
};

const Photos = () => {
  const { setParams, goBack } = useNavigation();
  const { params } = useRoute<RouteProp<NavParams, 'Photos'>>();
  const onIndexChange = useCallback(
    (index) => {
      setParams({ index });
    },
    [setParams]
  );

  return (
    <View style={styles.container}>
      <AwesomeGallery
        images={images}
        renderImage={renderImage}
        initialIndex={params.index}
        onIndexChange={onIndexChange}
        onSwipeToClose={goBack}
      />
    </View>
  );
};

export default function App() {
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
