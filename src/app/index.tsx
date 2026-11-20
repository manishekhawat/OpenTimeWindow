import { router } from 'expo-router';
import NearbyScreen from '../screens/NearbyScreen';
import { setSelectedPhoto } from '../services/selection';

export default function Index() {
  return (
    <NearbyScreen
      onOpen={(photo) => {
        setSelectedPhoto(photo);
        router.push('/window');
      }}
    />
  );
}
