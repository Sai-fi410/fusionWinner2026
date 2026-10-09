# Design: Look, Feel and Interaction

This document defines how the Hybrid Decentralized Swarm System looks and behaves for the people using it: judges, teammates and an audience watching a screen from a distance. The design has three jobs. It must make invisible coordination visible, it must stay readable from the back of a room, and it must give the system a memorable identity.

## 1. Design principles

1. **Show the swarm thinking.** Reservations, yields and congestion should be visible, not hidden in logs.
2. **Readable at distance.** Large type, strong contrast, few colours, generous spacing.
3. **State is colour, colour is state.** One colour per robot state, used everywhere without exception.
4. **Calm by default, loud on events.** The idle screen is quiet. Failures and Judge Mode actions get clear motion and colour so the audience notices them.
5. **No decoration without meaning.** Every glow, ring and trail communicates something.

## 2. Visual identity: ghost-tech

The brand is a ghost-tech look inspired by a friendly ghost mascot: rounded, soft, slightly playful bodies with luminous status lights, on a dark technical field.

- **Chassis metaphor:** a rounded white body with a small "face" panel where the status light lives. The shape reads as a ghost from above and as a clean robot in side view.
- **Glow:** a soft outer glow in the state colour. Glow strength is constant so it does not imply meaning by itself.
- **Mood:** friendly but precise. Rounded corners on cards and buttons, sharp thin lines on the grid.

## 3. Colour system

### 3.1 State colours

| State | Colour | Use |
| --- | --- | --- |
| Moving | Cyan | Robot heading to a pick-up |
| Carrying | Green | Robot with a parcel |
| Idle | Yellow | Robot waiting for a task |
| Failed | Red | Robot killed or faulted |

Yielding robots keep their base state colour and add a dashed ring so the state set stays at four.

### 3.2 Heatmap

Cell congestion runs from green (low) through yellow to red (high). Because green and red also appear in robot states, the heatmap is drawn as a translucent cell tint under the robots, never as a glow, so the two meanings stay separate. A legend bar is always visible.

### 3.3 Interface palette

- **Background:** very dark blue-grey for the arena, so glows stand out.
- **Panels:** slightly lighter dark surfaces with thin borders.
- **Text:** near-white for primary text, soft grey for secondary.
- **Accent:** the teal and orange already used in the event template, so slides and dashboard feel related.

### 3.4 Accessibility

- Never rely on colour alone. States also have a shape cue: a small icon inside the robot (arrow, box, pause, cross).
- Contrast between text and background meets a minimum ratio of 4.5 to 1.
- The heatmap has a patterned alternative for colour-blind viewers.

## 4. Typography

- A clean geometric sans-serif for the interface. A bolder weight for titles and numbers.
- A monospaced face for coordinates, tick counters and logs.
- Minimum on-screen text size is large by design: telemetry labels are never smaller than readable from several metres on a projector.
- Big numbers for key metrics, with small labels beneath, so a judge can read the result at a glance.

## 5. Layout

The dashboard has four zones on a single screen:

1. **Arena (centre, about 65% of the width):** the grid, robots, reservations, heatmap and trails.
2. **Judge Mode panel (right):** Kill, obstacle tools, robot-count slider and priority spike.
3. **Metrics strip (top or bottom):** deliveries per minute, average re-route time, active robots, failed robots and server link status.
4. **Event log (collapsible):** a short, readable stream of events such as "R12 failed, R7 claimed parcel P3".

On a projector, the arena goes full screen with the Judge Mode panel as a slide-out. On a phone, the panel sits below the arena.

## 6. The arena view

### 6.1 Grid

Thin low-contrast lines, with brighter lines every fifth cell for orientation. Pick-up and drop-off points use distinct shapes, a square and a circle outline. Side bays have a subtle hatched fill so the audience understands where yielding robots go.

### 6.2 Robots

- Rounded body with a facing indicator.
- State-colour glow and inner icon.
- Label with robot ID that appears on hover or when zoomed in, to avoid clutter at 60 robots.
- A short fading trail to show recent movement. Trails can be toggled.

### 6.3 Communication ring

R_comm is drawn as a faint ring around a selected robot, never all of them at once. Lines connect the selected robot to neighbours with active messages, and pulse briefly on a reservation exchange. This is the single most important teaching visual, because it shows peer coordination.

### 6.4 Reservations

Reserved future cells appear as small outlined squares in the reserving robot's colour. When a reservation is denied, the square flashes once and the robot shows a yield cue. The audience can literally watch negotiation happen.

### 6.5 Heatmap overlay

A toggle blends the congestion tint on. Robots slowly steer away from red zones, and the visual change in flow patterns should be easy to see over about ten seconds.

## 7. Judge Mode interaction

Judge Mode must feel safe, immediate and obvious.

- **Kill:** click a robot, then press a large red Kill button, or press a keyboard shortcut. The robot turns red, flashes, and a ring pulses outward to mark the fault broadcast. A neighbouring robot visibly claims the parcel.
- **Obstacles:** click a cell to drop an obstacle, click again to remove. Obstacles appear with a short drop animation and a warning colour.
- **Slider:** changes robot count smoothly, adding or removing robots at free cells.
- **Priority spike:** marks a task as express, with a gold outline and an early right-of-way ripple.
- **Undo and reset:** a reset button returns to the seeded start state, so a demo can be repeated.
- Every action is confirmed in the event log with a timestamp.

## 8. Motion

- Movement is interpolated between ticks so robots glide rather than jump.
- Event animations are short, under about half a second, and never block interaction.
- A reduced-motion setting disables trails, pulses and glows for viewers who need it.
- Frame pacing matters more than effects: if the frame rate drops, decorative motion is the first thing to switch off.

## 9. Analytics visuals

- Line chart for deliveries per minute against time, with a marker where a Kill or obstacle was injected.
- Bar chart comparing the swarm against a baseline.
- Latency chart showing local decision time and, separately, network round trip, so the two are never confused.
- Each chart uses the same axis styling, font sizes and colours.

## 10. Hardware design

- Compact round-cornered chassis, light body colour, with a diffuser on top for an RGB status LED matching the four state colours.
- Sensors face forward and slightly down. Encoders on both wheels. Battery low and centred for stability.
- Distinct fiducial or grid markers on the arena floor for position correction, printed in high contrast.
- A visible emergency stop switch on the robot.
- The arena is a simple matte board with a printed grid matching the simulation, so the virtual and physical worlds look alike.

## 11. Slide and print alignment

Slides use the event template. The dashboard reuses its teal and orange accents and the same four state colours in diagrams, so screenshots can go straight onto slides. Titles are large, body text is never reduced to fit, and each slide carries one main message.

## 12. Design checklist before the event

- Readable from the back of the room on a projector.
- All four states recognisable in greyscale by icon.
- Kill, obstacle and slider work within one click.
- Heatmap legend visible.
- Reduced-motion mode tested.
- Screenshots captured for the slides and the fallback video.
