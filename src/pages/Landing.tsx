import SimulationDemo from "@/components/SimulationDemo";
import ActionTokenizer from "@/components/ActionTokenizer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Cpu, Loader2 } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router";

export default function Landing() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const scrollToSection = useCallback((id: string) => {
    const node = document.getElementById(id);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const focusSimulationInput = useCallback(() => {
    const input = document.getElementById("simulation-command");
    if (input instanceof HTMLInputElement) {
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const highlights = [
    "Natural language commands trigger a live PyBullet pick-and-place run.",
    "See semantic grounding decisions and discrete action tokens side by side.",
    "Use the experience as an RT-2 explainer for classrooms and project demos.",
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img src="./logo.svg" alt="RT-2" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight">
              RT-2 Platform
            </span>
          </div>
          <Button
            onClick={() => navigate(isAuthenticated ? "/" : "/auth")}
            variant="outline"
          >
            {isAuthenticated ? "Dashboard" : "Get Started"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </nav>

      <main className="flex-1">
        <section
          id="hero"
          className="py-12 px-6 bg-gradient-to-b from-background via-background to-muted/40"
        >
          <div className="max-w-7xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-6 max-w-4xl mx-auto"
            >
              <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1 text-sm font-medium shadow-sm">
                <Cpu className="h-4 w-4" />
                RT-2 Simulation Demo with Existing Tools
              </span>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Bring RT-2 concepts to life through simulation and action
                tokenization
              </h1>
              <p className="text-base text-muted-foreground">
                Combine a PyBullet-based manipulation demo with an interactive
                action tokenizer to explain how Robotics Transformer 2
                understands and executes everyday language commands.
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-left">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-3 justify-center">
                {/* <Button size="lg" onClick={focusSimulationInput}>
                  Start Simulation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button> */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollToSection("visualizer")}
                >
                  Explore Tokenization
                  <BookOpen className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="w-full"
            >
              <SimulationDemo />
            </motion.div>
          </div>
        </section>

        <section id="visualizer" className="py-20 px-6 bg-muted/30">
          <div className="max-w-7xl mx-auto space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="max-w-2xl"
            >
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Action Tokenization Visualizer
              </h2>
              <p className="text-muted-foreground">
                Demonstrate how continuous 7-DoF robot actions and termination
                flags become discrete tokens that RT-2 style models can reason
                over. Sync the bins coming from the backend so students see
                consistent data between the sim and the visualizer.
              </p>
            </motion.div>
            <ActionTokenizer />
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>RT-2 Educational Platform • College Project Demonstration</p>
        </div>
      </footer>
    </div>
  );
}
