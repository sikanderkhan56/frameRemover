/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-video', () => {
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: View,
  };
});

jest.mock('@react-native-community/slider', () => {
  const {View} = require('react-native');
  return View;
});

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  types: {video: 'video/*'},
  errorCodes: {OPERATION_CANCELED: 'OPERATION_CANCELED'},
  isErrorWithCode: jest.fn(() => false),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
