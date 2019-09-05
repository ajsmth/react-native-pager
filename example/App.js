/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  Button,
  Alert,
  TouchableOpacity,
} from 'react-native';

console.disableYellowBox = true;

import {Pager} from '../src';

const colors = [
  'coral',
  'aquamarine',
  'gold',
  'cadetblue',
  'crimson',
  'darkorange',
  'darkmagenta',
  'salmon',
];

const App = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const children = Array.from({length: activeIndex + 2}, (c, i) => (
    <View
      key={i}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors[i % colors.length],
      }}>
      <Text>{`Screen: ${i}`}</Text>
      <Button title="Hello" onPress={() => Alert.alert('Joe')} />
    </View>
  ));

  return (
    <SafeAreaView style={{flex: 1}}>
      <Pager
        activeIndex={activeIndex}
        onChange={setActiveIndex}
        adjacentChildOffset={2}>
        {children}
      </Pager>

      <Buttons activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
    </SafeAreaView>
  );
};

function Buttons({activeIndex, setActiveIndex}) {
  return (
    <View style={{height: 75, width: '100%'}}>
      <Text
        style={{
          fontSize: 16,
          height: 25,
          textAlign: 'center',
        }}>{`activeIndex: ${activeIndex}`}</Text>

      <View style={{flex: 1, flexDirection: 'row'}}>
        <TouchableOpacity
          title="Dec"
          style={{
            flex: 1,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setActiveIndex(activeIndex - 1)}>
          <Text>{`<`}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setActiveIndex(activeIndex + 1)}>
          <Text>{`>`}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default App;
