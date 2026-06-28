"use client"

import { useEffect, useId, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckboxCircleFill,
  RiCheckLine,
  RiCloseCircleLine,
  RiFileCheckLine,
  RiImageAddLine,
  RiInformationLine,
  RiLink,
  RiLoader4Line,
} from "@remixicon/react"

import { UploadButton } from "@/lib/uploadthing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
// Select components removed — not needed for benchmark form
import { getAllCategories, submitProject } from "@/app/actions/projects"

interface BenchmarkFormData {
  name: string
  websiteUrl: string
  description: string
  categories: string[]
  sourceUrl: string
  paperUrl: string
  repoUrl: string
  twitterUrl: string
  logoUrl: string | null
  productImage: string | null
}

export function SubmitProjectForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<BenchmarkFormData>({
    name: "",
    websiteUrl: "",
    description: "",
    categories: [],
    sourceUrl: "",
    paperUrl: "",
    repoUrl: "",
    twitterUrl: "",
    logoUrl: null,
    productImage: null,
  })

  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useId() // reserve for future tag input

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    setIsLoadingCategories(true)
    try {
      const data = await getAllCategories()
      setCategories(data)
    } catch {
      setError("Failed to load categories")
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const nextStep = () => {
    setError(null)
    if (currentStep === 1) {
      if (!formData.name || !formData.websiteUrl || !formData.description) {
        setError("Please fill in all required fields.")
        return
      }
      if (!uploadedLogoUrl) {
        setError("Please upload a logo.")
        return
      }
      try {
        new URL(formData.websiteUrl)
      } catch {
        setError("Please enter a valid website URL.")
        return
      }
    }
    if (currentStep === 2) {
      if (formData.categories.length === 0) {
        setError("Please select at least one category.")
        return
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const prevStep = () => {
    setError(null)
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleFinalSubmit = async () => {
    setIsPending(true)
    setError(null)

    try {
      const finalLogoUrl =
        process.env.NODE_ENV === "development" && !uploadedLogoUrl
          ? "https://placehold.co/128x128/E2E8F0/718096?text=B"
          : uploadedLogoUrl!

      const projectData = {
        name: formData.name,
        description: formData.description,
        websiteUrl: formData.websiteUrl,
        logoUrl: finalLogoUrl,
        productImage: formData.productImage,
        categories: formData.categories,
        techStack: [],
        platforms: ["web"],
        pricing: "free",
        githubUrl: formData.repoUrl || null,
        twitterUrl: formData.twitterUrl || null,
        sourceUrl: formData.sourceUrl || null,
        paperUrl: formData.paperUrl || null,
      }

      const result = await submitProject({
        ...projectData,
        platforms: ["web"],
        pricing: "free",
      } as Parameters<typeof submitProject>[0])
      if (!result.success || !result.slug) {
        throw new Error(result.error || "Failed to submit benchmark.")
      }

      router.push(`/projects/${result.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
      setIsPending(false)
    }
  }

  const renderStepper = () => (
    <div className="mb-8">
      <div className="container mx-auto max-w-3xl">
        <div className="flex items-center justify-between pt-2">
          {[
            { step: 1, label: "Benchmark Info", icon: RiInformationLine },
            { step: 2, label: "Categories & Links", icon: RiLink },
            { step: 3, label: "Review", icon: RiFileCheckLine },
          ].map(({ step, label, icon: Icon }) => (
            <div key={`step-${step}`} className="relative flex flex-1 flex-col items-center">
              {step < 3 && (
                <div className="absolute top-5 left-[calc(50%+1.5rem)] -z-10 hidden h-[2px] w-[calc(100%-1rem)] sm:block">
                  <div
                    className={`h-full ${currentStep > step ? "bg-primary" : "bg-muted"} transition-all duration-300`}
                  />
                </div>
              )}
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
                  currentStep > step
                    ? "bg-primary ring-primary/10 text-white ring-4"
                    : currentStep === step
                      ? "bg-primary ring-primary/20 text-white ring-4"
                      : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {currentStep > step ? (
                  <RiCheckLine className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                {currentStep === step && (
                  <span className="border-primary absolute inset-0 animate-pulse rounded-full border-2" />
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium sm:text-sm ${
                  currentStep >= step ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">
                Benchmark Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. SWE-Bench Verified"
                required
              />
            </div>
            <div>
              <Label htmlFor="websiteUrl">
                Benchmark Website <span className="text-red-500">*</span>
              </Label>
              <Input
                id="websiteUrl"
                name="websiteUrl"
                type="url"
                value={formData.websiteUrl}
                onChange={handleInputChange}
                placeholder="https://www.swebench.com"
                required
              />
              <p className="text-muted-foreground mt-1 text-xs">
                The main website for this benchmark.
              </p>
            </div>
            <div>
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <RichTextEditor
                content={formData.description}
                onChange={(content) => setFormData((prev) => ({ ...prev, description: content }))}
                placeholder="What does this benchmark measure? What models does it evaluate?"
                className="max-h-[300px] overflow-y-auto"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Logo <span className="text-red-500">*</span>
              </Label>
              <p className="text-muted-foreground text-xs">
                Recommended: 1:1 square image (e.g., 256x256px).
              </p>
              {uploadedLogoUrl ? (
                <div className="bg-muted/30 relative w-fit rounded-md border p-3">
                  <Image
                    src={uploadedLogoUrl}
                    alt="Logo preview"
                    width={64}
                    height={64}
                    className="rounded object-contain"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground absolute top-1 right-1 h-6 w-6"
                    onClick={() => setUploadedLogoUrl(null)}
                  >
                    <RiCloseCircleLine className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <UploadButton
                    endpoint="projectLogo"
                    onUploadBegin={() => setIsUploadingLogo(true)}
                    onClientUploadComplete={(res) => {
                      setIsUploadingLogo(false)
                      if (res?.[0]?.serverData?.fileUrl) {
                        setUploadedLogoUrl(res[0].serverData.fileUrl)
                      }
                    }}
                    onUploadError={(err) => {
                      setIsUploadingLogo(false)
                      setError(`Logo upload failed: ${err.message}`)
                    }}
                    appearance={{
                      button: `ut-button border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm h-9 px-3 inline-flex items-center justify-center gap-2 ${isUploadingLogo ? "opacity-50 pointer-events-none" : ""}`,
                      allowedContent: "hidden",
                    }}
                    content={{
                      button({ ready, isUploading }) {
                        if (isUploading) return <RiLoader4Line className="h-4 w-4 animate-spin" />
                        if (ready)
                          return (
                            <>
                              <RiImageAddLine className="h-4 w-4" /> Upload Logo
                            </>
                          )
                        return "Getting ready..."
                      },
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">
                Categories <span className="text-red-500">*</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  ({formData.categories.length} selected)
                </span>
              </Label>
              {isLoadingCategories ? (
                <div className="text-muted-foreground flex items-center gap-2">
                  <RiLoader4Line className="h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : categories.length > 0 ? (
                <div className="max-h-60 space-y-3 overflow-y-auto rounded-md border p-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`cat-${cat.id}`}
                        checked={formData.categories.includes(cat.id)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          if (checked && formData.categories.length >= 5) {
                            setError("Max 5 categories.")
                            return
                          }
                          setFormData((prev) => ({
                            ...prev,
                            categories: checked
                              ? [...prev.categories, cat.id]
                              : prev.categories.filter((c) => c !== cat.id),
                          }))
                        }}
                        className="border-input rounded"
                      />
                      <Label htmlFor={`cat-${cat.id}`} className="cursor-pointer font-normal">
                        {cat.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No categories available.</p>
              )}
              <p className="text-muted-foreground mt-1 text-xs">
                Select categories that best describe this benchmark.
              </p>
            </div>

            <div>
              <Label htmlFor="sourceUrl">
                Data Source URL <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="sourceUrl"
                name="sourceUrl"
                type="url"
                value={formData.sourceUrl}
                onChange={handleInputChange}
                placeholder="https://api.swebench.com/scores"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                A URL we can auto-fetch to keep scores updated (JSON, HTML, or CSV).
              </p>
            </div>

            <div>
              <Label htmlFor="paperUrl">
                Research Paper URL <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="paperUrl"
                name="paperUrl"
                type="url"
                value={formData.paperUrl}
                onChange={handleInputChange}
                placeholder="https://arxiv.org/abs/2310.xxxxx"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="repoUrl">
                  GitHub / Source Code <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="repoUrl"
                  name="repoUrl"
                  type="url"
                  value={formData.repoUrl}
                  onChange={handleInputChange}
                  placeholder="https://github.com/user/benchmark-repo"
                />
              </div>
              <div>
                <Label htmlFor="twitterUrl">
                  Twitter / X <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="twitterUrl"
                  name="twitterUrl"
                  type="url"
                  value={formData.twitterUrl}
                  onChange={handleInputChange}
                  placeholder="https://x.com/benchmark"
                />
              </div>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Review & Submit</h3>
            <div className="bench-card space-y-4 p-4">
              <div className="flex items-start gap-4">
                {uploadedLogoUrl && (
                  <Image
                    src={uploadedLogoUrl}
                    alt="Logo"
                    width={48}
                    height={48}
                    className="rounded-lg object-contain"
                  />
                )}
                <div>
                  <h4 className="font-medium">{formData.name || "Untitled"}</h4>
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {formData.description?.replace(/<[^>]*>/g, "").trim() || "No description"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Website:</span>{" "}
                  <a
                    href={formData.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {formData.websiteUrl || "—"}
                  </a>
                </div>
                <div>
                  <span className="text-muted-foreground">Categories:</span>{" "}
                  {formData.categories
                    .map((c) => {
                      const cat = categories.find((x) => x.id === c)
                      return cat?.name || c
                    })
                    .join(", ") || "—"}
                </div>
                {formData.sourceUrl && (
                  <div>
                    <span className="text-muted-foreground">Source URL:</span>{" "}
                    <a
                      href={formData.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {formData.sourceUrl}
                    </a>
                  </div>
                )}
                {formData.paperUrl && (
                  <div>
                    <span className="text-muted-foreground">Paper:</span>{" "}
                    <a
                      href={formData.paperUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {formData.paperUrl}
                    </a>
                  </div>
                )}
                {formData.repoUrl && (
                  <div>
                    <span className="text-muted-foreground">Source code:</span>{" "}
                    <a
                      href={formData.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {formData.repoUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-muted/30 border-muted flex items-start gap-2 rounded-lg border p-3">
              <RiInformationLine className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
              <p className="text-xs sm:text-sm">
                Your benchmark will appear in the directory immediately. If you provided a data
                source URL, Benchlist will auto-fetch and update scores regularly.
              </p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Submit a Benchmark</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Add an AI benchmark to the Benchlist directory. It will be reviewed and go live shortly.
        </p>
      </div>

      {renderStepper()}

      <div className="space-y-6">
        {renderStepContent()}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between pt-4">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={prevStep}>
              <RiArrowLeftLine className="mr-1 h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <Button onClick={nextStep}>
              Next <RiArrowRightLine className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinalSubmit} disabled={isPending}>
              {isPending ? (
                <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RiCheckboxCircleFill className="mr-2 h-4 w-4" />
              )}
              Submit Benchmark
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
