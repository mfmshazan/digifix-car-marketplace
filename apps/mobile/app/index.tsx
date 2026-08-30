import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { getValidToken } from "../src/api/storage";
import BrandedLoading from "../src/components/BrandedLoading";

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getValidToken();
        setIsAuthenticated(!!token);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  if (isChecking) {
    return <BrandedLoading />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(customer)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
