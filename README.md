# SensoryTracker: Special Education Tracking Tool

A comprehensive FERPA-compliant application designed to help special education teachers track and analyze student sensory processing and emotional responses. Built with accessibility and neurodiversity in mind.

## 🎯 Core Features

### Student Management
- **Student Profiles**: Comprehensive student information with IEP goals integration
- **Real-time Tracking**: Emotion and sensory input tracking with intensity scales
- **Pattern Analysis**: Advanced algorithms to identify trends and correlations
- **Goal Monitoring**: Track progress towards IEP objectives with visual indicators

### Data Visualization & Analytics
- **Interactive Charts**: Accessible visualizations using Recharts with colorblind-friendly palettes
- **Correlation Analysis**: Identify relationships between sensory inputs and emotional responses
- **Predictive Insights**: AI-powered pattern recognition for proactive interventions
- **Export Capabilities**: PDF reports, CSV data, and JSON backups

### Performance & Accessibility
- **Offline-First**: Works without internet connectivity using localStorage
- **Dyslexia-Friendly**: OpenDyslexic font and optimized typography (line-height: 1.6+)
- **WCAG 2.1 AA**: Full accessibility compliance with keyboard navigation
- **High Performance**: Virtual scrolling, lazy loading, and intelligent caching

## 🚀 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives
- **Charts**: Recharts for accessible data visualization
- **Routing**: React Router v6
- **State Management**: React Query + localStorage
- **Date Handling**: date-fns
- **Forms**: React Hook Form + Zod validation

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/UI components
│   ├── lazy/           # Lazy-loaded components
│   └── ...             # Feature components
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and services
│   ├── dataStorage.ts  # FERPA-compliant data management
│   ├── patternAnalysis.ts # Analytics algorithms
│   └── alertSystem.ts  # Notification system
├── types/              # TypeScript interfaces
└── assets/             # Static resources
```

## 🎨 Design System

### Color Palette
- **Primary**: `hsl(180 65% 35%)` - Calming teal for neurodiversity support
- **Emotion Colors**: Happy `hsl(90 70% 65%)`, Anxious `hsl(40 65% 70%)`
- **Sensory Colors**: Visual `hsl(240 60% 70%)`, Auditory `hsl(300 50% 70%)`

### Typography
- **Font Stack**: OpenDyslexic, Inter, sans-serif
- **Line Height**: 1.6-1.7 for enhanced readability
- **Letter Spacing**: 0.02em for dyslexia support

### Component Patterns
- **Gradient Cards**: `bg-gradient-card` with `shadow-soft`
- **Intensity Scales**: 1-5 visual indicators
- **Status Badges**: Color-coded with text labels

## 🔒 Data Privacy & Security

### FERPA Compliance
- **Local Storage Only**: No external data transmission
- **Data Encryption**: Client-side encryption for sensitive information
- **Access Controls**: Role-based permissions (planned)
- **Audit Trail**: Comprehensive logging of data access

### Data Management
- **Versioned Storage**: Migration-safe data structures
- **Backup/Restore**: Full data export/import functionality
- **Data Validation**: Zod schema validation for all inputs
- **Error Recovery**: Graceful handling of corrupted data

## 📊 Performance Optimizations

### Lazy Loading
- Route-based code splitting
- Component-level lazy loading for heavy analytics
- Progressive image loading

### Caching Strategy
- **Performance Cache**: LRU cache with TTL for expensive calculations
- **Pattern Analysis Cache**: Memoized correlation computations
- **Component Memoization**: React.memo for expensive renders

### Virtual Scrolling
- Efficient rendering of large student lists
- Paginated session data with virtual scrolling
- Optimized re-renders for real-time updates

## 🧪 Development Guidelines

### Code Quality
- **TypeScript**: Strict mode with comprehensive type coverage
- **ESLint**: Custom rules for accessibility and performance
- **Testing**: Unit tests for critical algorithms
- **Documentation**: JSDoc for all public APIs

### Accessibility Standards
- **Keyboard Navigation**: Full app navigable without mouse
- **Screen Reader**: ARIA labels and semantic HTML
- **Color Contrast**: WCAG AA compliance verified
- **Focus Management**: Logical tab order and focus indicators

### Performance Monitoring
- **Bundle Analysis**: Webpack bundle analyzer for optimization
- **Core Metrics**: Performance monitoring for loading times
- **Memory Usage**: Leak detection for long-running sessions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- Modern browser with ES2020+ support

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd sensorytracker

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
```

## 📈 Analytics & Insights

### Pattern Recognition
- **Emotion Patterns**: Time-based emotional trend analysis
- **Sensory Correlations**: Cross-modal sensory processing insights
- **Environmental Factors**: Impact of classroom conditions
- **Intervention Effectiveness**: Goal progress tracking

### Predictive Analytics
- **Risk Assessment**: Early warning system for challenging behaviors
- **Optimization Recommendations**: Personalized intervention suggestions
- **Progress Forecasting**: IEP goal achievement predictions

## 🤝 Contributing

### Code Standards
- Follow TypeScript strict mode
- Use semantic commits (feat:, fix:, docs:)
- Maintain 100% type coverage
- Write accessibility-compliant components

### Testing Strategy
- Unit tests for business logic
- Integration tests for data flow
- Accessibility testing with screen readers
- Performance testing with large datasets

## Project Info

**Original URL**: https://lovable.dev/projects/24448151-9720-4835-9cbf-e375e7bdc408

## How to Edit

**Use Lovable**: Visit the [Lovable Project](https://lovable.dev/projects/24448151-9720-4835-9cbf-e375e7bdc408) and start prompting.

**Use your preferred IDE**: Clone this repo and push changes. Pushed changes will also be reflected in Lovable.

Requirements: Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

## Deployment

Simply open [Lovable](https://lovable.dev/projects/24448151-9720-4835-9cbf-e375e7bdc408) and click on Share → Publish.

## Custom Domain

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

---

**Built with ❤️ for special education professionals and the students they serve.**