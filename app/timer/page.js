import GymDisplay from "@/components/GymDisplay";

export const metadata = {
  title: "Round Timer · PJA",
  description: "Full-screen BJJ round timer",
};

export default function TimerPage() {
  return <GymDisplay defaultMode="timer" />;
}
