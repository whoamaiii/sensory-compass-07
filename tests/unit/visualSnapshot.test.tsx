import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock data for consistent snapshots
const mockStudentData = {
  id: 'test-student-1',
  name: 'John Doe',
  grade: '8',
  dateOfBirth: '2010-01-01',
  notes: 'Test student for snapshot testing',
  iepGoals: [
    {
      id: 'goal-1',
      title: 'Improve Focus',
      description: 'Improve attention span through sensory strategies',
      progress: 65
    }
  ],
  createdAt: new Date('2024-01-01'),
  lastUpdated: new Date('2024-01-15'),
  version: 1
};

const mockEmotionData = [
  {
    id: 'emotion-1',
    studentId: 'test-student-1',
    timestamp: new Date('2024-01-15T10:00:00'),
    emotion: 'happy',
    intensity: 4,
    triggers: ['positive feedback'],
    notes: 'Student responded well to praise'
  },
  {
    id: 'emotion-2',
    studentId: 'test-student-1',
    timestamp: new Date('2024-01-15T14:00:00'),
    emotion: 'anxious',
    intensity: 3,
    triggers: ['loud noise'],
    notes: 'Fire alarm caused distress'
  }
];

const mockSensoryData = [
  {
    id: 'sensory-1',
    studentId: 'test-student-1',
    timestamp: new Date('2024-01-15T10:00:00'),
    type: 'auditory',
    sensoryType: 'auditory',
    response: 'avoiding',
    intensity: 4,
    notes: 'Covered ears during music class'
  },
  {
    id: 'sensory-2',
    studentId: 'test-student-1',
    timestamp: new Date('2024-01-15T14:00:00'),
    type: 'tactile',
    sensoryType: 'tactile',
    response: 'seeking',
    intensity: 3,
    notes: 'Requested fidget toy'
  }
];

// Mock components for snapshot testing
const StudentCard = ({ student }: { student: typeof mockStudentData }) => (
  <div className="student-card">
    <h2>{student.name}</h2>
    <p>Grade: {student.grade}</p>
    <p>DOB: {student.dateOfBirth}</p>
    <p>Notes: {student.notes}</p>
    <div className="goals">
      <h3>IEP Goals:</h3>
      {student.iepGoals.map(goal => (
        <div key={goal.id} className="goal">
          <h4>{goal.title}</h4>
          <p>{goal.description}</p>
          <progress value={goal.progress} max={100}>{goal.progress}%</progress>
        </div>
      ))}
    </div>
  </div>
);

const EmotionChart = ({ emotions }: { emotions: typeof mockEmotionData }) => (
  <div className="emotion-chart">
    <h3>Emotion Tracking</h3>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Emotion</th>
          <th>Intensity</th>
          <th>Triggers</th>
        </tr>
      </thead>
      <tbody>
        {emotions.map(emotion => (
          <tr key={emotion.id}>
            <td>{emotion.timestamp.toLocaleTimeString()}</td>
            <td>{emotion.emotion}</td>
            <td>{emotion.intensity}/5</td>
            <td>{emotion.triggers.join(', ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SensoryProfile = ({ sensoryData }: { sensoryData: typeof mockSensoryData }) => (
  <div className="sensory-profile">
    <h3>Sensory Profile</h3>
    <div className="sensory-items">
      {sensoryData.map(item => (
        <div key={item.id} className="sensory-item">
          <span className="type">{item.sensoryType}</span>
          <span className="response">{item.response}</span>
          <span className="intensity">Intensity: {item.intensity}/5</span>
          {item.notes && <p className="notes">{item.notes}</p>}
        </div>
      ))}
    </div>
  </div>
);

const Dashboard = ({ student, emotions, sensory }: { 
  student: typeof mockStudentData,
  emotions: typeof mockEmotionData,
  sensory: typeof mockSensoryData
}) => (
  <div className="dashboard">
    <h1>Student Dashboard</h1>
    <StudentCard student={student} />
    <div className="data-sections">
      <EmotionChart emotions={emotions} />
      <SensoryProfile sensoryData={sensory} />
    </div>
  </div>
);

describe('Visual Snapshot Tests', () => {
  test('StudentCard component renders consistently', () => {
    const { container } = render(<StudentCard student={mockStudentData} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('EmotionChart component renders consistently', () => {
    const { container } = render(<EmotionChart emotions={mockEmotionData} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('SensoryProfile component renders consistently', () => {
    const { container } = render(<SensoryProfile sensoryData={mockSensoryData} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('Dashboard component renders consistently', () => {
    const { container } = render(
      <Dashboard 
        student={mockStudentData} 
        emotions={mockEmotionData} 
        sensory={mockSensoryData} 
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  test('Empty states render consistently', () => {
    const { container: emptyEmotions } = render(<EmotionChart emotions={[]} />);
    expect(emptyEmotions.firstChild).toMatchSnapshot();

    const { container: emptySensory } = render(<SensoryProfile sensoryData={[]} />);
    expect(emptySensory.firstChild).toMatchSnapshot();
  });

  test('Components with different data render differently', () => {
    const altEmotionData = [{
      ...mockEmotionData[0],
      id: 'emotion-alt',
      emotion: 'frustrated',
      intensity: 5
    }];

    const { container: original } = render(<EmotionChart emotions={mockEmotionData} />);
    const { container: altered } = render(<EmotionChart emotions={altEmotionData} />);

    expect(original.innerHTML).not.toBe(altered.innerHTML);
  });
});
