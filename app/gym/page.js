import GymDisplay from "@/components/GymDisplay";

export const metadata = {
  title: "Gym TV Display · PJA",
  description: "Split-screen BJJ round timer and live ClubWorx check-in display",
};

export default function GymPage() {
  return <GymDisplay defaultMode="split" />;
}
