import SimulationDemo from "@/components/SimulationDemo";
import ActionTokenizer from "@/components/ActionTokenizer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Cpu, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";

export default function Landing() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src="./logo.svg" alt="RT-2" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight">RT-2 Platform</span>
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

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              RT-2 Educational Platform
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Interactive demonstrations of Robotics Transformer 2 concepts through simulation and action tokenization
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Start Learning
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                Documentation
              </Button>
            </div>
          </motion.div>

          {/* Simulation Demo */}
          <div className="mb-20">
            <SimulationDemo />
          </div>

          {/* Action Tokenizer */}
          <div className="mb-20">
            <ActionTokenizer />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Understanding RT-2
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Learn how vision-language models enable robots to understand and execute natural language commands
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-background p-8 rounded-lg border-2"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-3">
                Simulation Environment
              </h3>
              <p className="text-muted-foreground text-sm">
                PyBullet-based physics simulation for testing RT-2 concepts with pick-and-place tasks
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-background p-8 rounded-lg border-2"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-3">
                Action Tokenization
              </h3>
              <p className="text-muted-foreground text-sm">
                Visualize how continuous robot actions are converted to discrete tokens for language model processing
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-background p-8 rounded-lg border-2"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <ArrowRight className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-3">
                Natural Language Control
              </h3>
              <p className="text-muted-foreground text-sm">
                Command robots using everyday language, powered by vision-language model integration
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>RT-2 Educational Platform • College Project Demonstration</p>
        </div>
      </footer>
    </div>
  );
}