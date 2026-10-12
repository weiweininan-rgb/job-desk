import { Briefcase } from "lucide-react";
import Index from "./pages/Index.jsx";

export const navItems = [
  {
    title: "求职管理",
    to: "/",
    icon: <Briefcase className="h-4 w-4" />,
    page: <Index />,
  },
];
