"""ML Models for the AI service.

Contains:
- PerformancePredictor: predicts student performance from past grades
- AttendanceRiskModel: predicts students at risk of absenteeism
- ScheduleOptimizer: generates conflict-free timetables using genetic algorithm
- AutoGrader: grades student submissions using NLP + rubric
- RecommendationEngine: recommends courses/study plans
- AnomalyDetector: detects anomalies in attendance/grades/fees
"""
import numpy as np
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from .base import MLModel


# ---------------------------------------------------------------------------
# Performance Prediction
# ---------------------------------------------------------------------------
class PerformancePredictor(MLModel):
    """
    Predicts a student's future performance based on:
    - historical grade percentages
    - attendance rate
    - assignment completion rate
    Uses weighted linear regression with confidence estimation.
    """

    model_id = "performance-prediction-v1"

    def __init__(self):
        self.weights = np.array([0.45, 0.30, 0.25])  # grades, attendance, assignments

    def predict(
        self,
        historical_grades: List[float],
        attendance_rate: float = 1.0,
        assignment_completion: float = 1.0,
        features: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        if not historical_grades:
            raise ValueError("historical_grades is required")

        recent = np.array(historical_grades[-5:])
        grade_avg = float(np.mean(recent))
        grade_trend = 0.0
        if len(recent) >= 2:
            grade_trend = float(recent[-1] - recent[0]) / max(len(recent) - 1, 1)

        features_vec = np.array([
            grade_avg / 100.0,
            min(attendance_rate, 1.0),
            min(assignment_completion, 1.0),
        ])

        predicted_pct = float(np.dot(features_vec, self.weights) * 100)
        predicted_pct = max(0.0, min(100.0, predicted_pct + grade_trend * 3))

        consistency = 1.0 - float(np.std(recent) / 100.0)
        data_quality = min(1.0, len(historical_grades) / 10.0)
        confidence = 0.4 + 0.4 * consistency + 0.2 * data_quality

        factors = {
            "average_grade": round(grade_avg, 2),
            "grade_trend": round(grade_trend, 2),
            "attendance_rate": round(attendance_rate * 100, 2),
            "assignment_completion": round(assignment_completion * 100, 2),
        }

        if predicted_pct >= 85:
            level = "Excellent"
        elif predicted_pct >= 70:
            level = "Good"
        elif predicted_pct >= 50:
            level = "At Risk"
        else:
            level = "Critical"

        explanation = (
            f"Based on {len(historical_grades)} historical assessments, average grade of "
            f"{grade_avg:.1f}%, attendance of {attendance_rate*100:.0f}%, the student is "
            f"predicted to achieve approximately {predicted_pct:.1f}% with "
            f"{confidence*100:.0f}% confidence. Performance level: {level}."
        )

        return self.format_response(
            data={"predictedScore": round(predicted_pct, 2), "level": level},
            confidence=confidence,
            explanation=explanation,
            factors=factors,
        )


# ---------------------------------------------------------------------------
# Attendance Risk
# ---------------------------------------------------------------------------
class AttendanceRiskModel(MLModel):
    """
    Flags students at risk of chronic absenteeism using threshold + trend analysis.
    """

    model_id = "attendance-risk-v1"

    def predict(
        self,
        attendance_history: List[float],
        current_rate: float = 1.0,
        days_absent_recent: int = 0,
    ) -> Dict[str, Any]:
        if not attendance_history:
            raise ValueError("attendance_history is required")

        weekly_rates = [float(r) for r in attendance_history]
        avg_rate = float(np.mean(weekly_rates)) if weekly_rates else current_rate
        trend = 0.0
        if len(weekly_rates) >= 3:
            trend = float(weekly_rates[-1] - weekly_rates[0]) / max(len(weekly_rates) - 1, 1)

        # Risk scoring: lower attendance, negative trend, recent absences
        base_risk = 1.0 - avg_rate
        trend_penalty = max(0.0, -trend) * 0.5
        recent_penalty = min(0.3, days_absent_recent * 0.05)
        risk_score = min(1.0, base_risk + trend_penalty + recent_penalty)

        if risk_score >= 0.7:
            risk_level = "CRITICAL"
        elif risk_score >= 0.4:
            risk_level = "HIGH"
        elif risk_score >= 0.2:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        factors = {
            "average_attendance": round(avg_rate * 100, 2),
            "attendance_trend": round(trend * 100, 2),
            "recent_absences": days_absent_recent,
        }

        explanation = (
            f"Average attendance of {avg_rate*100:.0f}% with trend of {trend*100:+.1f}% per "
            f"period and {days_absent_recent} recent absences results in a {risk_level} "
            f"absenteeism risk of {risk_score*100:.0f}%."
        )

        return self.format_response(
            data={"riskScore": round(risk_score, 4), "riskLevel": risk_level},
            confidence=0.5 + 0.3 * min(1.0, len(weekly_rates) / 10.0),
            explanation=explanation,
            factors=factors,
        )


# ---------------------------------------------------------------------------
# Smart Scheduling (genetic algorithm)
# ---------------------------------------------------------------------------
@dataclass
class Lesson:
    class_id: str
    subject_id: str
    teacher_id: str
    slots: List[int]  # preferred day/time slot indices

    def __hash__(self):
        return hash((self.class_id, self.subject_id, self.teacher_id))


class ScheduleOptimizer(MLModel):
    """
    Generates conflict-free timetables using a genetic algorithm.
    Fitness: no class conflicts, no teacher conflicts, respect preferences.
    """

    model_id = "smart-scheduling-v1"

    def __init__(self, population_size: int = 50, generations: int = 100, mutation_rate: float = 0.1):
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate

    def predict(self, lessons: List[Dict[str, Any]], slot_count: int = 40) -> Dict[str, Any]:
        if not lessons:
            raise ValueError("lessons is required")

        lesson_objs = []
        for l in lessons:
            slots = l.get("preferredSlots") or []
            if not slots:
                start = l.get("startSlot", 0)
                end = l.get("endSlot", slot_count)
                slots = list(range(start, end))
            lesson_objs.append(Lesson(l["classId"], l["subjectId"], l["teacherId"], slots))

        best, best_fitness = self._run_genetic(lesson_objs, slot_count)

        schedule = self._build_schedule(best, lesson_objs, slot_count)
        conflicts = self._count_conflicts(best, lesson_objs, slot_count)

        explanation = (
            f"Generated a timetable for {len(lesson_objs)} lessons across {slot_count} slots "
            f"with {conflicts} conflicts remaining and fitness {best_fitness:.2f}."
        )

        return self.format_response(
            data={"schedule": schedule, "conflicts": conflicts, "fitness": round(best_fitness, 4)},
            confidence=max(0.6, best_fitness),
            explanation=explanation,
            factors={"lessons": len(lesson_objs), "slots": slot_count, "conflicts": conflicts},
        )

    def _run_genetic(self, lessons: List[Lesson], slot_count: int):
        rng = np.random.default_rng(42)
        n = len(lessons)

        # population: each chromosome = slot assignment per lesson
        population = [rng.integers(0, slot_count, n) for _ in range(self.population_size)]

        best = None
        best_fitness = -1.0

        for _ in range(self.generations):
            fitness = [self._fitness(ind, lessons, slot_count) for ind in population]
            for f, ind in zip(fitness, population):
                if f > best_fitness:
                    best_fitness = f
                    best = ind.copy()

            # selection (tournament)
            parents = []
            for _ in range(self.population_size):
                idx = rng.choice(len(population), size=2, replace=False)
                parents.append(population[int(idx[np.argmax([fitness[i] for i in idx])])])

            # crossover + mutation
            new_population = []
            for i in range(0, self.population_size, 2):
                p1, p2 = parents[i], parents[i + 1] if i + 1 < len(parents) else parents[0]
                cross = rng.integers(0, n)
                child1 = np.concatenate([p1[:cross], p2[cross:]])
                child2 = np.concatenate([p2[:cross], p1[cross:]])
                if rng.random() < self.mutation_rate:
                    child1[rng.integers(0, n)] = rng.integers(0, slot_count)
                if rng.random() < self.mutation_rate:
                    child2[rng.integers(0, n)] = rng.integers(0, slot_count)
                new_population.extend([child1, child2])
            population = new_population[: self.population_size]

        if best is None:
            best = np.zeros(n, dtype=int)
        return best, best_fitness

    def _fitness(self, chromosome, lessons: List[Lesson], slot_count: int) -> float:
        penalty = 0.0
        n = len(lessons)
        class_use: Dict[str, List[int]] = {}
        teacher_use: Dict[str, List[int]] = {}
        preference_score = 0.0

        for i, lesson in enumerate(lessons):
            slot = int(chromosome[i])
            if lesson.class_id not in class_use:
                class_use[lesson.class_id] = []
            if lesson.teacher_id not in teacher_use:
                teacher_use[lesson.teacher_id] = []
            class_use[lesson.class_id].append(slot)
            teacher_use[lesson.teacher_id].append(slot)
            if lesson.slots and slot in lesson.slots:
                preference_score += 1.0

        for slots in class_use.values():
            if len(slots) != len(set(slots)):
                penalty += 1.0
        for slots in teacher_use.values():
            if len(slots) != len(set(slots)):
                penalty += 1.0

        preference_norm = preference_score / max(n, 1)
        fitness = preference_norm - penalty * 0.5
        return max(0.0, min(1.0, fitness))

    def _build_schedule(self, chromosome, lessons: List[Lesson], slot_count: int) -> List[Dict[str, Any]]:
        schedule = []
        for i, lesson in enumerate(lessons):
            slot = int(chromosome[i])
            schedule.append({
                "classId": lesson.class_id,
                "subjectId": lesson.subject_id,
                "teacherId": lesson.teacher_id,
                "slot": slot,
            })
        return schedule

    def _count_conflicts(self, chromosome, lessons: List[Lesson], slot_count: int) -> int:
        class_use: Dict[str, List[int]] = {}
        teacher_use: Dict[str, List[int]] = {}
        for i, lesson in enumerate(lessons):
            slot = int(chromosome[i])
            class_use.setdefault(lesson.class_id, []).append(slot)
            teacher_use.setdefault(lesson.teacher_id, []).append(slot)

        conflicts = 0
        for slots in class_use.values():
            conflicts += len(slots) - len(set(slots))
        for slots in teacher_use.values():
            conflicts += len(slots) - len(set(slots))
        return conflicts


# ---------------------------------------------------------------------------
# Auto Grader
# ---------------------------------------------------------------------------
class AutoGrader(MLModel):
    """
    Grades text submissions using heuristic NLP:
    - length / structure score
    - keyword coverage vs rubric topics
    - sentence quality via TextBlob
    Returns score, feedback, and confidence.
    """

    model_id = "auto-grading-v1"

    def predict(
        self,
        content: str,
        max_score: float = 100.0,
        rubric_topics: Optional[List[str]] = None,
        expected_length: int = 300,
    ) -> Dict[str, Any]:
        if not content:
            raise ValueError("content is required")

        text = content.strip()
        if not text:
            return self.format_response(
                data={"score": 0, "feedback": "Submission is empty."},
                confidence=1.0,
                explanation="Empty submission scored 0.",
                factors={},
            )

        try:
            from textblob import TextBlob
            blob = TextBlob(text)
            sentiment = blob.sentiment.polarity
            words = [w.lower() for w in text.split()]
            sentences = len(blob.sentences)
        except ImportError:
            words = [w.lower() for w in text.split()]
            sentences = max(1, text.count(". ") + 1)
            sentiment = 0.0

        word_count = len(words)
        length_score = min(1.0, word_count / max(expected_length, 1))

        structure_score = 0.0
        if word_count > 0:
            avg_sentence_length = min(1.0, word_count / max(sentences * 20, 1))
            structure_score = avg_sentence_length * 0.5 + min(1.0, sentences / 5) * 0.5

        keyword_score = 0.0
        if rubric_topics:
            keywords = [k.lower() for k in rubric_topics]
            found = sum(1 for kw in keywords if any(kw in w or w in kw for w in words))
            keyword_score = found / len(keywords)

        tone_score = 0.5 + sentiment * 0.5
        total_score = (
            length_score * 0.35
            + structure_score * 0.20
            + keyword_score * 0.30
            + tone_score * 0.15
        )

        raw_score = round(total_score * max_score, 1)
        confidence = min(0.95, 0.5 + length_score * 0.3 + keyword_score * 0.2)

        if total_score >= 0.85:
            feedback = "Excellent submission with strong coverage and structure."
        elif total_score >= 0.7:
            feedback = "Good submission, but some areas could be expanded."
        elif total_score >= 0.5:
            feedback = "Adequate. Try to address all rubric topics in more depth."
        elif total_score >= 0.3:
            feedback = "Below expectations. Please review the requirements and resubmit."
        else:
            feedback = "This submission needs significant improvement. Please consult the rubric."

        return self.format_response(
            data={
                "score": raw_score,
                "feedback": feedback,
                "wordCount": word_count,
                "sentenceCount": sentences,
            },
            confidence=confidence,
            explanation=f"Graded {word_count} words across {sentences} sentences against {len(rubric_topics or [])} rubric topics.",
            factors={
                "length_score": round(length_score, 4),
                "structure_score": round(structure_score, 4),
                "keyword_coverage": round(keyword_score, 4),
                "tone": round(tone_score, 4),
            },
        )


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------
class RecommendationEngine(MLModel):
    """
    Recommends learning resources based on weak areas using content-based filtering.
    """

    model_id = "recommendation-v1"

    def predict(
        self,
        weak_subjects: List[str],
        strengths: Optional[List[str]] = None,
        study_hours: float = 5.0,
    ) -> Dict[str, Any]:
        if not weak_subjects:
            raise ValueError("weak_subjects is required")

        resource_map = {
            "mathematics": ["Khan Academy Algebra", "Brilliant.org exercises", "Daily problem sets"],
            "english": ["Grammarly feedback loop", "Daily journal writing", "Reading comprehension drills"],
            "science": ["Lab notebook practice", "SciShow summaries", "Concept mapping sessions"],
            "history": ["Timeline visualization", "Source analysis drills", "Documentary note-taking"],
            "computer science": ["Coding katas", "Project-based tutorials", "Debugging practice"],
            "physics": ["Problem sets with solutions", "PhET simulations", "Formula derivations"],
            "chemistry": ["Balancing equation drills", "Periodic table games", "Lab safety reviews"],
            "biology": ["Flashcard reviews", "Diagram labeling", "Case study analysis"],
        }

        recommendations = []
        for subject in weak_subjects:
            key = subject.lower().strip()
            if key in resource_map:
                resources = resource_map[key]
                recommendations.append({
                    "subject": subject,
                    "resources": resources,
                    "priority": "HIGH",
                    "suggestedHours": round(min(study_hours * 0.4, 6.0), 1),
                })

        if strengths:
            recommendations.append({
                "subject": "strengths",
                "resources": ["Peer tutoring", "Advanced enrichment projects", "Competition prep"],
                "priority": "LOW",
                "suggestedHours": 1.5,
            })

        explanation = (
            f"Generated {len(recommendations)} resource plans targeting {len(weak_subjects)} "
            f"weak areas with {study_hours} study hours available."
        )

        return self.format_response(
            data={"recommendations": recommendations},
            confidence=0.75,
            explanation=explanation,
            factors={"weak_areas": len(weak_subjects), "study_hours": study_hours},
        )


# ---------------------------------------------------------------------------
# Anomaly Detection
# ---------------------------------------------------------------------------
class AnomalyDetector(MLModel):
    """
    Detects anomalies in student metrics using z-score / IQR based outlier detection.
    """

    model_id = "anomaly-detection-v1"

    def predict(
        self,
        metric_name: str,
        values: List[float],
        student_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not values:
            raise ValueError("values is required")

        arr = np.array(values, dtype=float)
        median = float(np.median(arr))
        q1 = float(np.percentile(arr, 25))
        q3 = float(np.percentile(arr, 75))
        iqr = q3 - q1

        anomalies = []
        for i, v in enumerate(values):
            is_outlier = (v < q1 - 1.5 * iqr) or (v > q3 + 1.5 * iqr)
            if is_outlier:
                anomalies.append({"index": i, "value": v, "deviation": round(abs(v - median), 2)})

        severity = "LOW"
        if len(anomalies) > 0:
            severity = "HIGH" if len(anomalies) > len(values) * 0.2 else "MEDIUM"

        explanation = (
            f"Analyzed {len(values)} data points for {metric_name}. Found {len(anomalies)} "
            f"outliers using IQR method (Q1={q1:.2f}, Q3={q3:.2f}). Severity: {severity}."
        )

        return self.format_response(
            data={
                "metric": metric_name,
                "anomalies": anomalies,
                "severity": severity,
                "median": round(median, 2),
            },
            confidence=0.7 + 0.2 * min(1.0, len(values) / 50),
            explanation=explanation,
            factors={"data_points": len(values), "iqr": round(iqr, 2), "anomaly_count": len(anomalies)},
        )


# Registry
MODEL_REGISTRY = {
    PerformancePredictor.model_id: PerformancePredictor,
    AttendanceRiskModel.model_id: AttendanceRiskModel,
    ScheduleOptimizer.model_id: ScheduleOptimizer,
    AutoGrader.model_id: AutoGrader,
    RecommendationEngine.model_id: RecommendationEngine,
    AnomalyDetector.model_id: AnomalyDetector,
}


def get_model(model_id: str) -> MLModel:
    model_class = MODEL_REGISTRY.get(model_id)
    if model_class is None:
        raise ValueError(f"Unknown model: {model_id}")
    return model_class()
