"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { ArrowRight, Globe, TrendingUp, MapPin, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"

const cities = [
  {
    name: "Lisbon",
    country: "Portugal",
    image: "/beautiful-aerial-view-of-lisbon-portugal-with-colo.jpg",
  },
  {
    name: "New York",
    country: "United States",
    image: "/stunning-manhattan-skyline-new-york-city-at-golden.jpg",
  },
  {
    name: "Mexico City",
    country: "Mexico",
    image: "/vibrant-mexico-city-aerial-view-with-historic-arch.jpg",
  },
  {
    name: "Bangkok",
    country: "Thailand",
    image: "/beautiful-bangkok-skyline-with-temples-and-modern-.jpg",
  },
]

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % cities.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % cities.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + cities.length) % cities.length)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="relative h-screen overflow-hidden">
        {/* Carousel Images */}
        <div className="absolute inset-0">
          {cities.map((city, index) => (
            <div
              key={city.name}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transform: `translateY(${scrollY * 0.5}px)`,
              }}
            >
              <img
                src={city.image || "/placeholder.svg"}
                alt={`${city.name}, ${city.country}`}
                className="w-full h-full object-cover"
              />
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-black/40" />
            </div>
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center space-y-8 px-4 max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="inline-block bg-black/60 backdrop-blur-sm rounded-lg px-6 py-3 mb-6">
                <h3 className="text-2xl font-bold text-white tracking-wide">
                  {cities[currentSlide].name}
                  <span className="text-white/80 font-normal ml-2">{cities[currentSlide].country}</span>
                </h3>
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white text-balance leading-tight">
                Same dollars, <span className="text-teal-400">smarter world</span>
              </h1>
              <p className="mx-auto max-w-2xl text-xl md:text-2xl text-white/90 text-pretty font-medium">
                See where your money goes the farthest with PPP-adjusted insights.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-lg px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white border-0">
                <Link href="/dashboard">
                  Connect my Capital One Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-all duration-200"
          aria-label="Previous city"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-all duration-200"
          aria-label="Next city"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
          {cities.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentSlide ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <div className="absolute bottom-8 right-8 z-20 text-white/80 animate-bounce">
          <div className="flex flex-col items-center space-y-2">
            <span className="text-sm font-medium">Scroll</span>
            <div className="w-px h-8 bg-white/60"></div>
          </div>
        </div>
      </section>

      <section className="py-32 bg-gradient-to-b from-background to-muted/30 relative">
        <div className="container px-4 mx-auto max-w-screen-xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-balance mb-6">
              Make your money work <span className="text-primary">smarter</span>
            </h2>
            <p className="mt-4 text-xl text-muted-foreground text-pretty max-w-3xl mx-auto">
              Understand the real value of your spending across different cities and countries with intelligent insights
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-10">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-8">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">PPP Insights</h3>
                <p className="text-muted-foreground text-pretty text-lg leading-relaxed">
                  See how your purchasing power compares across different cities and countries with real-time PPP data.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-10">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-accent/10 mb-8">
                  <TrendingUp className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Smart Budgeting</h3>
                <p className="text-muted-foreground text-pretty text-lg leading-relaxed">
                  Plan your budget with location-aware insights that show how far your money goes in different places.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-10">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-8">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Location Compare</h3>
                <p className="text-muted-foreground text-pretty text-lg leading-relaxed">
                  Compare living costs and spending power between your current location and potential destinations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5"></div>
        <div className="container px-4 mx-auto max-w-screen-xl relative z-10">
          <div className="text-center space-y-10">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">
              Ready to make <span className="text-primary">smarter</span> financial decisions?
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground text-pretty leading-relaxed">
              Connect your Capital One account and start discovering where your money has the most impact around the
              world.
            </p>
            <Button
              asChild
              size="lg"
              className="text-lg px-10 py-4 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Link href="/dashboard">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-muted/20">
        <div className="container px-4 mx-auto max-w-screen-xl">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">PPP estimates only. Educational use.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
