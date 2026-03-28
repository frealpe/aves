import { useEffect, useState } from 'react';
import useLocationStore from '../store/useLocationStore';

export const useLiveLocation = () => {
  const { setCoordinates, setPermissions } = useLocationStore();
  const [error, setError] = useState(null);

  useEffect(() => {
    // This hook encapsulates location logic.
    // In a real implementation using expo-location:
    // 1. Request foreground permissions.
    // 2. If granted, use watchPositionAsync.
    // 3. Update store on new coordinates.
    // 4. Handle errors (e.g., location services disabled).

    const requestAndWatchLocation = async () => {
      try {
        // Placeholder for actual implementation:
        // const { status } = await Location.requestForegroundPermissionsAsync();
        // if (status !== 'granted') {
        //   setPermissions(false);
        //   setError('Permission to access location was denied');
        //   return;
        // }
        // setPermissions(true);
        //
        // const locationSubscription = await Location.watchPositionAsync(
        //   { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        //   (location) => {
        //     setCoordinates([location.coords.latitude, location.coords.longitude]);
        //   }
        // );
        // return () => locationSubscription.remove();

        console.log("Mock location watching started.");
        setPermissions(true);

        // Mock updating location every 5s
        const interval = setInterval(() => {
            setCoordinates([Math.random() * 90, Math.random() * 180]);
        }, 5000);

        return () => clearInterval(interval);

      } catch (err) {
        setError(err.message);
      }
    };

    let isMounted = true;
    let cleanupFunction = null;

    requestAndWatchLocation().then((cleanup) => {
      if (!isMounted && cleanup && typeof cleanup === 'function') {
        cleanup(); // Cleanup immediately if unmounted during the async call
      } else {
        cleanupFunction = cleanup;
      }
    });

    return () => {
      isMounted = false;
      if (cleanupFunction && typeof cleanupFunction === 'function') {
        cleanupFunction();
      }
    };
  }, [setCoordinates, setPermissions]);

  return { error };
};

export default useLiveLocation;
