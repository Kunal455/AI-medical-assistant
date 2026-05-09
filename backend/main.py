import os
import requests
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

load_dotenv()

app = FastAPI()

# Gemini Setup via LangChain
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0,
    google_api_key=os.getenv("GEMINI_API_KEY", "placeholder_key_to_prevent_startup_crash")
)
parser = StrOutputParser()

# --- MEDICAL REPORT ANALYZER ---
report_prompt = PromptTemplate(
    input_variables=["reportText"],
    template="""You are an AI medical assistant. Analyze this medical report.
Report:
{reportText}

Provide a structured response using Markdown:
## 1. Important Findings
## 2. Abnormal Values
## 3. Possible Meaning
## 4. Simple Explanation
## 5. Precautions
## 6. When to Consult a Doctor

*Note: Do not provide a final diagnosis. Advise consulting a doctor.*"""
)
report_chain = report_prompt | llm | parser

class ReportRequest(BaseModel):
    reportText: str

@app.post("/analyze/report")
async def analyze_report(data: ReportRequest):
    try:
        response = report_chain.invoke({"reportText": data.reportText})
        return {"response": response}
    except Exception as e:
        print("Report Error:", e)
        return {"error": str(e)}

# --- PRESCRIPTION READER ---
class PrescriptionRequest(BaseModel):
    prescriptionText: str

@app.post("/analyze/prescription")
async def analyze_prescription(data: PrescriptionRequest):
    try:
        # We can reuse Grok to parse the prescription OCR text
        prompt = f"You are a prescription analysis assistant.\nExtracted prescription text:\n{data.prescriptionText}\n\nProvide a structured response using Markdown in simple language:\n## 1. Medicine Names\n## 2. Possible Usage of Each Medicine\n## 3. Dosage Timing (if visible)\n## 4. Important Precautions\n\n*Note: Always advise verifying with the prescribing doctor or pharmacist.*"
        msg = [SystemMessage(content="You are a medical assistant."), HumanMessage(content=prompt)]
        res = llm.invoke(msg)
        return {"response": res.content}
    except Exception as e:
        print("Prescription Error:", e)
        return {"error": str(e)}

# --- SYMPTOM CHECKER (INFERMEDICA) ---
class SymptomRequest(BaseModel):
    symptoms: str

@app.post("/analyze/symptoms")
async def analyze_symptoms(data: SymptomRequest):
    try:
        headers = {
            "App-Id": os.getenv("INFERMEDICA_APP_ID", ""),
            "App-Key": os.getenv("INFERMEDICA_APP_KEY", ""),
            "Content-Type": "application/json"
        }
        
        # 1. Parse natural language
        parse_res = requests.post(
            "https://api.infermedica.com/v3/parse",
            json={"text": data.symptoms, "age": {"value": 30}},
            headers=headers
        )
        if parse_res.status_code != 200:
            raise Exception("Infermedica Parse Failed")
        
        mentions = parse_res.json().get("mentions", [])
        if not mentions:
            return {"analysis": {"possibleConditions": [], "message": "Could not detect specific medical symptoms."}}
            
        evidence = [{"id": m["id"], "choice_id": m["choice_id"], "source": "initial"} for m in mentions]
        
        # 2. Diagnosis
        diag_res = requests.post(
            "https://api.infermedica.com/v3/diagnosis",
            json={"sex": "male", "age": {"value": 30}, "evidence": evidence},
            headers=headers
        )
        diag_data = diag_res.json()
        
        conditions = []
        for c in diag_data.get("conditions", [])[:3]:
            conditions.append({
                "name": c["name"],
                "probability": str(round(c["probability"] * 100)) + "%"
            })
            
        # 3. Triage
        triage_res = requests.post(
            "https://api.infermedica.com/v3/triage",
            json={"sex": "male", "age": {"value": 30}, "evidence": evidence},
            headers=headers
        )
        triage_data = triage_res.json()
        
        return {"analysis": {
            "possibleConditions": conditions,
            "severity": triage_data.get("triage_level", "Unknown"),
            "specialistRecommendation": "Teleconsultation" if triage_data.get("teleconsultation_applicable") else "Primary Care Physician"
        }}
    except Exception as e:
        print("Symptom Error:", e)
        return {"error": str(e)}

# --- MEDICINE LOOKUP (OPENFDA) ---
class MedicineRequest(BaseModel):
    medicineName: str

@app.post("/analyze/medicine")
async def analyze_medicine(data: MedicineRequest):
    try:
        url = f"https://api.fda.gov/drug/label.json?search=openfda.brand_name:\"{data.medicineName}\"+openfda.generic_name:\"{data.medicineName}\"&limit=1"
        res = requests.get(url)
        if res.status_code != 200:
            raise Exception("Medicine not found in FDA database")
            
        fda_data = res.json()["results"][0]
        
        medicine_info = {
            "name": fda_data.get("openfda", {}).get("brand_name", [data.medicineName])[0],
            "genericName": fda_data.get("openfda", {}).get("generic_name", ["Unknown"])[0],
            "uses": fda_data.get("indications_and_usage", ["No usage information available"])[0],
            "sideEffects": fda_data.get("adverse_reactions", ["No side effects listed"])[0],
            "warnings": fda_data.get("warnings", ["No specific warnings"])[0],
            "precautions": fda_data.get("precautions", ["No precautions listed"])[0]
        }
        return {"medicine": medicine_info}
    except Exception as e:
        print("Medicine Error:", e)
        return {"error": str(e)}

# --- CHAT ---
class ChatRequest(BaseModel):
    messages: list

@app.post("/chat")
async def chat(data: ChatRequest):
    try:
        # messages is list of dicts {"role": "...", "text": "..."}
        # LangChain expects structured messages
        langchain_msgs = [SystemMessage(content="You are a highly empathetic and knowledgeable AI medical assistant. CRITICAL RULES: 1. ONLY answer questions related to medicine, health, or wellness. 2. If the user asks about ANYTHING else (e.g. coding, math, politics), politely refuse and state you are strictly a medical assistant. 3. Do not provide final diagnoses. Keep responses structured and easy to read using Markdown.")]
        
        for msg in data.messages:
            if msg.get("role") == "user":
                langchain_msgs.append(HumanMessage(content=msg.get("text", "")))
            elif msg.get("role") == "ai":
                langchain_msgs.append(AIMessage(content=msg.get("text", ""))) 
                
        res = llm.invoke(langchain_msgs)
        return {"response": res.content}
    except Exception as e:
        print("Chat Error:", e)
        return {"error": str(e)}
