import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import AwesomeGallery, { RenderItemInfo } from 'react-native-awesome-gallery';
import * as React from 'react';
import type { NavParams } from '../navigation/types';
import { SharedElement } from 'react-navigation-shared-element';
import FastImage from 'react-native-fast-image';

const renderItem = ({
  index,
  item,
  setImageDimensions,
}: RenderItemInfo<{ uri: string }>) => {
  return (
    <SharedElement id={`${index}`} style={StyleSheet.absoluteFillObject}>
      <FastImage
        source={{ uri: item.uri }}
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

export const Photos = () => {
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
        data={params.images.map((uri) => ({ uri }))}
        keyExtractor={(item) => item.uri}
        renderItem={renderItem}
        initialIndex={params.index}
        onIndexChange={onIndexChange}
        onSwipeToClose={goBack}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
