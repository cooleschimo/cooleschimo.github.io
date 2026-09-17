import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin)

export { gsap, ScrollTrigger }
