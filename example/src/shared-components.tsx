import React from 'react';
import {Text, View, TouchableOpacity, StyleSheet} from 'react-native';

const colors = [
  'aquamarine',
  'coral',
  'gold',
  'cadetblue',
  'crimson',
  'darkorange',
  'darkmagenta',
  'salmon',
];

function Slide({i}: {i: number}) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginHorizontal: 5,
        backgroundColor: colors[i % colors.length],
      }}>
      <Text>{`Screen: ${i}`}</Text>
    </View>
  );
}

interface iPagerConsumer {
  activeIndex: number;
  onChange: (nextIndex: number) => void;
}

function NavigationButtons({activeIndex, onChange}: iPagerConsumer) {
  return (
    <View
      style={{
        height: 75,
        width: '100%',
        backgroundColor: 'white',
        marginTop: 10,
      }}>
      <Text
        style={{
          fontSize: 16,
          height: 25,
          textAlign: 'center',
        }}>{`activeIndex: ${activeIndex}`}</Text>

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 10,
        }}>
        <TouchableOpacity
          style={{
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
            width: 150,
          }}
          onPress={() => onChange(activeIndex - 1)}>
          <Text>{`<`}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
            width: 150,
          }}
          onPress={() => onChange(activeIndex + 1)}>
          <Text>{`>`}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export {Slide, NavigationButtons, colors};
