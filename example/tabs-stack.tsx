import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, View, Text} from 'react-native';
import {Pager} from '@crowdlinker/react-native-pager';

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

function Stack({children}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={{flex: 1, borderWidth: StyleSheet.hairlineWidth}}>
      <Pager
        activeIndex={activeIndex}
        onChange={setActiveIndex}
        clamp={{prev: 0.3}}
        clampDrag={{prev: 0}}
        style={{flex: 1, overflow: 'hidden', paddingVertical: 5}}>
        {children}
      </Pager>

      <View style={{height: 50, flexDirection: 'row'}}>
        <TouchableOpacity
          onPress={() =>
            setActiveIndex(Math.min(activeIndex + 1, children.length - 1))
          }
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors[activeIndex],
          }}>
          <Text style={{color: colors[activeIndex]}}>Push</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Tabs({children}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={{flex: 1, borderWidth: StyleSheet.hairlineWidth}}>
      <Pager
        activeIndex={activeIndex}
        onChange={setActiveIndex}
        style={{flex: 1, overflow: 'hidden', paddingVertical: 5}}>
        {children}
      </Pager>

      <View style={{height: 50, flexDirection: 'row'}}>
        {React.Children.map(children, (c, i) => (
          <TouchableOpacity
            onPress={() => setActiveIndex(i)}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: activeIndex === i ? colors[i] : 'black',
            }}>
            <Text style={{color: activeIndex === i ? colors[i] : 'black'}}>
              {i + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export {Stack, Tabs};
