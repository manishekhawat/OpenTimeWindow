import { Redirect, router } from 'expo-router';
import TimeWindowScreen from '../screens/TimeWindowScreen';
import { getSelectedPhoto } from '../services/selection';

export default function Window() {
  const photo = getSelectedPhoto();
  if (!photo) return <Redirect href="/" />;
  return <TimeWindowScreen photo={photo} onClose={() => router.back()} />;
}
