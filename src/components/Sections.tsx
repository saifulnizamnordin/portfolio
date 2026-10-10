import { ArrowUpRight, Award, BadgeCheck, GraduationCap, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GithubIcon, LinkedinIcon } from "@/components/icons"
import { about, certifications, education, leadership, profile, skillGroups } from "@/data/profile"

export function Hero() {
  return (
    <section className="flex flex-col gap-6 pt-12 pb-4 sm:pt-20">
      <img
        src={profile.avatar}
        alt={profile.name}
        width={80}
        height={80}
        className="size-20 rounded-full bg-muted object-cover ring-1 ring-foreground/10"
      />
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{profile.name}</h1>
        <p className="text-lg text-muted-foreground sm:text-xl">{profile.headline}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{profile.currentRole}</span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {profile.location}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="lg">
          <a href={profile.links.linkedin} target="_blank" rel="noreferrer">
            <LinkedinIcon className="size-4" />
            LinkedIn
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href={profile.links.github} target="_blank" rel="noreferrer">
            <GithubIcon className="size-4" />
            GitHub
          </a>
        </Button>
      </div>
    </section>
  )
}

export function SectionHeading({ id, title, eyebrow }: { id: string; title: string; eyebrow: string }) {
  return (
    <div id={id} className="mb-6 scroll-mt-20">
      <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
    </div>
  )
}

export function About() {
  return (
    <div className="space-y-6">
      <div className="space-y-4 text-base leading-relaxed">
        {about.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle>Leadership & Collaboration</CardTitle>
        </CardHeader>
        <CardContent className="leading-relaxed text-muted-foreground">{leadership}</CardContent>
      </Card>
    </div>
  )
}

export function Skills() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {skillGroups.map((group) => (
        <Card key={group.name} size="sm">
          <CardHeader>
            <CardTitle>{group.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function Education() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <GraduationCap className="size-4" /> Education
        </h3>
        {education.map((e) => (
          <Card key={e.school}>
            <CardHeader>
              <CardTitle>{e.school}</CardTitle>
              <CardDescription>{e.degree}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-muted-foreground">
              <p className="tabular-nums">{e.period}</p>
              <p>Activities and societies: {e.activities}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Award className="size-4" /> Licenses & Certifications
        </h3>
        {certifications.map((c) => (
          <Card key={c.name}>
            <CardHeader>
              <CardTitle className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {c.name}
              </CardTitle>
              <CardDescription>{c.issuer}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                Issued {c.issued}
                {c.credentialId && <> · Credential ID {c.credentialId}</>}
              </p>
              {c.skills && (
                <div className="flex flex-wrap gap-1.5">
                  {c.skills.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="mt-24 border-t py-8 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} {profile.name}</p>
        <div className="flex gap-4">
          <a className="inline-flex items-center gap-1 hover:text-foreground" href={profile.links.linkedin} target="_blank" rel="noreferrer">
            LinkedIn <ArrowUpRight className="size-3.5" />
          </a>
          <a className="inline-flex items-center gap-1 hover:text-foreground" href={profile.links.github} target="_blank" rel="noreferrer">
            GitHub <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </footer>
  )
}
