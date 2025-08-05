"""
AILang Adapter Package
Provides integration between AILang model definitions and the agent orchestration system
"""

from .ailang_parser import (
    AILangParser, 
    load_ailang_model,
    AILangModel,
    AgentDefinition,
    ConsensusDefinition,
    TaskDefinition,
    SystemConfig
)

from .ailang_adapter import AILangAdapter

__all__ = [
    'AILangParser',
    'load_ailang_model',
    'AILangModel',
    'AILangAdapter',
    'AgentDefinition',
    'ConsensusDefinition',
    'TaskDefinition',
    'SystemConfig'
]
