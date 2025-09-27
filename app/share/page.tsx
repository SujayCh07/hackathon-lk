"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShareCard } from "@/components/share-card"
import { Download, Share2, Copy, Twitter, Facebook, Linkedin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

// Mock data for share cards
const shareTemplates = [
  {
    id: "ppp-score",
    name: "PPP Score Card",
    description: "Share your purchasing power score",
  },
  {
    id: "budget-comparison",
    name: "Budget Comparison",
    description: "Show how far your budget goes",
  },
  {
    id: "city-savings",
    name: "City Savings",
    description: "Highlight potential savings",
  },
]

const mockUserData = {
  name: "Alex Johnson",
  currentCity: "New York, NY",
  pppScore: 85,
  monthlyBudget: 3000,
  bestCity: "Bangkok, Thailand",
  savings: 68,
  totalSavings: 2040,
}

export default function ShareCardGenerator() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState("ppp-score")
  const [selectedCity, setSelectedCity] = useState("Bangkok, Thailand")
  const cardRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirectTo=${encodeURIComponent("/share")}`)
    }
  }, [loading, user, router])

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          {loading ? "Checking your session…" : "Redirecting you to log in…"}
        </div>
      </div>
    )
  }

  const handleDownloadPNG = async () => {
    // Placeholder for PNG download functionality
    toast({
      title: "Download Started",
      description: "Your share card is being prepared for download.",
    })
  }

  const handleDownloadPDF = async () => {
    // Placeholder for PDF download functionality
    toast({
      title: "PDF Export",
      description: "PDF export functionality will be available soon.",
    })
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link Copied",
        description: "Share link has been copied to your clipboard.",
      })
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy link to clipboard.",
        variant: "destructive",
      })
    }
  }

  const handleSocialShare = (platform: string) => {
    const shareText = `Check out my PPP insights! My money goes ${mockUserData.savings}% further in ${selectedCity}. #PPPPocket #SmartSpending`
    const shareUrl = window.location.href

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    }

    window.open(urls[platform as keyof typeof urls], "_blank", "width=600,height=400")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container px-4 py-8 mx-auto max-w-screen-xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Share Card Generator</h1>
          <p className="text-muted-foreground">Create and share your PPP insights with beautiful cards</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Card Customization */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customize Your Card</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Card Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shareTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-muted-foreground">{template.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Compare City</label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bangkok, Thailand">🇹🇭 Bangkok, Thailand</SelectItem>
                      <SelectItem value="Mexico City, Mexico">🇲🇽 Mexico City, Mexico</SelectItem>
                      <SelectItem value="Prague, Czech Republic">🇨🇿 Prague, Czech Republic</SelectItem>
                      <SelectItem value="London, UK">🇬🇧 London, UK</SelectItem>
                      <SelectItem value="Zurich, Switzerland">🇨🇭 Zurich, Switzerland</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Button onClick={handleDownloadPNG} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Save as PNG
                  </Button>
                  <Button onClick={handleDownloadPDF} variant="outline" className="w-full bg-transparent">
                    <Download className="h-4 w-4 mr-2" />
                    Save as PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Social Sharing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Share Your Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleCopyLink} variant="outline" className="w-full bg-transparent">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Share Link
                </Button>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => handleSocialShare("twitter")}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </Button>
                  <Button
                    onClick={() => handleSocialShare("facebook")}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </Button>
                  <Button
                    onClick={() => handleSocialShare("linkedin")}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={cardRef} className="flex justify-center">
                  <ShareCard template={selectedTemplate} userData={mockUserData} compareCity={selectedCity} />
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Sharing Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5">
                    1
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">Choose the right template</p>
                    <p className="text-xs text-muted-foreground">
                      PPP Score cards work great for general sharing, while Budget Comparison is perfect for travel
                      planning.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5">
                    2
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">Pick an interesting comparison</p>
                    <p className="text-xs text-muted-foreground">
                      Cities with significant cost differences make for more engaging shares.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5">
                    3
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">Add context when sharing</p>
                    <p className="text-xs text-muted-foreground">
                      Include a personal note about your travel plans or financial goals.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
