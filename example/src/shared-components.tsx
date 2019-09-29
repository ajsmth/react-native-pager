import React, {useState} from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Button,
} from 'react-native';
import {useFocus} from '@crowdlinker/react-native-pager';

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
  // const [count, setCount] = useState(0);
  const focused = useFocus();

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
      <Text>{`Focused: ${focused}`}</Text>
      {/* <TextInput placeholder="Test Update" />
      <Text>{`Count: ${count}`}</Text>
      <Button title="Inc" onPress={() => setCount(count + 1)} /> */}
    </View>
  );
}

interface iPagerConsumer {
  activeIndex: number;
  onChange: (nextIndex: number) => void;
  incrementBy?: number;
}

function NavigationButtons({
  activeIndex,
  onChange,
  incrementBy = 1,
}: iPagerConsumer) {
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
          onPress={() => onChange(activeIndex - incrementBy)}>
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
          onPress={() => onChange(activeIndex + incrementBy)}>
          <Text>{`>`}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export {Slide, NavigationButtons, colors};
