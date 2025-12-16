// app/index.tsx
import { Redirect } from "expo-router";

export default function Index() {
  // פתיחה לברירת מחדל: טאב הבית (המסך עם המדינות)
  return <Redirect href="/(tabs)" />;
}
