import * as React from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  Dimensions,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SharedElement } from 'react-navigation-shared-element';
import FastImage from 'react-native-fast-image';
import type { NavParams } from '../navigation/types';

const { height } = Dimensions.get('window');

const getRandomSize = function () {
  const min = 1000;
  const max = 2000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const images = new Array(10)
  .fill(0)
  .map(() => `https://picsum.photos/${getRandomSize()}/${getRandomSize()}`);

export const Home = () => {
  const { navigate } = useNavigation<NavigationProp<NavParams>>();

  return (
    <View style={styles.container}>
      {images.map((uri, index) => (
        <TouchableWithoutFeedback
          key={uri}
          onPress={() => navigate('Photos', { index, images })}
        >
          <SharedElement id={`${index}`} style={styles.imageContainer}>
            <FastImage source={{ uri }} style={StyleSheet.absoluteFillObject} />
          </SharedElement>
        </TouchableWithoutFeedback>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageContainer: {
    width: '50%',
    height: (height / images.length) * 2,
  },
});
