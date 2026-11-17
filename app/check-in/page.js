import GymDisplay from "@/components/GymDisplay";

export const metadata = {
  title: "Check In Display · PJA",
  description: "Live ClubWorx class check-in display",
};

export default function CheckInPage() {
  return <GymDisplay defaultMode="check-in" />;
}
