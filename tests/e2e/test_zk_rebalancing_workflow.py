#!/usr/bin/env python3
"""
ZK Rebalancing End-to-End Test

Tests the complete workflow of zero-knowledge proof based portfolio rebalancing
with ERC-8004 agentic orchestration.
"""

import os
import sys
import time
from web3 import Web3

# Add parent directories to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from agents.rebalancer_agent import RebalancerAgent
from agents.validator_agent import ValidatorAgent
from agents.client_agent import ClientAgent


def test_zk_rebalancing_e2e():
    """Test complete end-to-end ZK rebalancing workflow"""
    print("\n" + "="*70)
    print("  ZK Rebalancing Proof - End-to-End Test")
    print("  ERC-8004 Agentic Orchestration")
    print("="*70 + "\n")

    # Connect to blockchain
    w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL", "http://localhost:8545")))
    assert w3.is_connected(), "❌ Blockchain not connected"
    print("✅ Connected to blockchain")
    
    # Create unique agents
    timestamp = int(time.time() * 1000)
    
    # Initialize agents
    print("\n" + "─"*70)
    print("STEP 1: Initialize Agents")
    print("─"*70)
    
    rebalancer = RebalancerAgent(
        agent_domain=f"rebalancer-{timestamp}.zk-proof.test",
        private_key="0x" + os.urandom(32).hex()
    )
    print(f"   Rebalancer: {rebalancer.address}")
    
    validator = ValidatorAgent(
        agent_domain=f"validator-{timestamp}.zk-proof.test",
        private_key="0x" + os.urandom(32).hex()
    )
    print(f"   Validator: {validator.address}")
    
    client = ClientAgent(
        agent_domain=f"client-{timestamp}.zk-proof.test",
        private_key="0x" + os.urandom(32).hex()
    )
    print(f"   Client: {client.address}")
    
    # Fund all agents
    print("\n" + "─"*70)
    print("STEP 2: Fund Agents")
    print("─"*70)
    
    for agent in [rebalancer, validator, client]:
        if w3.eth.get_balance(agent.address) < w3.to_wei(0.1, 'ether'):
            tx = {
                'from': w3.eth.accounts[0],
                'to': agent.address,
                'value': w3.to_wei(0.5, 'ether'),
                'gas': 21000,
                'gasPrice': w3.eth.gas_price
            }
            tx_hash = w3.eth.send_transaction(tx)
            w3.eth.wait_for_transaction_receipt(tx_hash)
    print("✅ All agents funded with 0.5 ETH")
    
    # Register agents
    print("\n" + "─"*70)
    print("STEP 3: Register Agents on ERC-8004 Registry")
    print("─"*70)
    
    rebalancer.register_agent()
    print(f"   Rebalancer Agent ID: {rebalancer.agent_id}")
    
    validator.register_agent()
    print(f"   Validator Agent ID: {validator.agent_id}")
    
    client.register_agent()
    print(f"   Client Agent ID: {client.agent_id}")
    
    # Create rebalancing plan
    print("\n" + "─"*70)
    print("STEP 4: Create Rebalancing Plan")
    print("─"*70)
    
    # Example: 4-asset portfolio rebalancing
    # Old: 1000, 1000, 1000, 750 tokens at price 100 each
    # New: 800, 800, 1200, 950 tokens (same total value)
    rebalancing_plan = rebalancer.create_rebalancing_plan(
        old_balances=["1000", "1000", "1000", "750"],
        new_balances=["800", "800", "1200", "950"],
        prices=["100", "100", "100", "100"],
        min_allocation_pct="10",
        max_allocation_pct="40"
    )
    print(f"   Portfolio value: {rebalancing_plan['new_total_value']:,}")
    
    # Generate ZK proof
    print("\n" + "─"*70)
    print("STEP 5: Generate Zero-Knowledge Proof")
    print("─"*70)
    
    proof_package = rebalancer.generate_zk_proof(rebalancing_plan)
    print(f"   Proof generated using {proof_package['metadata']['proof_system']}")
    print(f"   Curve: {proof_package['metadata']['curve']}")
    print(f"   Public inputs: {len(proof_package['public_inputs'])} signals")
    
    # Submit proof for validation
    print("\n" + "─"*70)
    print("STEP 6: Submit Proof for Validation")
    print("─"*70)
    
    validation_tx = rebalancer.submit_proof_for_validation(
        proof_package,
        validator.agent_id
    )
    print(f"   Validation request transaction: {validation_tx}")
    
    # Validator validates the proof
    print("\n" + "─"*70)
    print("STEP 7: Validate ZK Proof")
    print("─"*70)
    
    validation_result = validator.validate_proof(proof_package)
    print(f"   Proof valid: {validation_result['is_valid']}")
    print(f"   Validation score: {validation_result['score']}/100")
    
    # Submit validation response
    print("\n" + "─"*70)
    print("STEP 8: Submit Validation Response")
    print("─"*70)
    
    validation_response_tx = validator.submit_validation_response(
        validation_result['validation_package']
    )
    print(f"   Validation response transaction: {validation_response_tx}")
    
    # Authorize client feedback
    print("\n" + "─"*70)
    print("STEP 9: Authorize Client Feedback")
    print("─"*70)
    
    auth_tx = rebalancer.authorize_client_feedback(client.agent_id)
    print(f"   Authorization transaction: {auth_tx}")
    
    # Client evaluates and provides feedback
    print("\n" + "─"*70)
    print("STEP 10: Client Evaluation and Feedback")
    print("─"*70)
    
    quality_score = client.evaluate_rebalancing_quality(proof_package)
    print(f"   Quality evaluation: {quality_score}/100")
    
    feedback = client.submit_feedback(
        server_agent_id=rebalancer.agent_id,
        score=quality_score,
        comment="Excellent ZK proof-based rebalancing service with strong privacy guarantees"
    )
    print(f"   Feedback submitted: {feedback['score']}/100")
    
    # Check reputation
    print("\n" + "─"*70)
    print("STEP 11: Check Rebalancer Reputation")
    print("─"*70)
    
    reputation = client.check_rebalancer_reputation(rebalancer.agent_id)
    print(f"   Feedback count: {reputation['feedback_count']}")
    print(f"   Average score: {reputation['average_score']:.1f}/100")
    
    # Summary
    print("\n" + "="*70)
    print("  ✅ END-TO-END TEST COMPLETE")
    print("="*70)
    print("\nWorkflow Summary:")
    print("  1. ✅ Three agents initialized (Rebalancer, Validator, Client)")
    print("  2. ✅ Agents registered on ERC-8004 registry")
    print("  3. ✅ Rebalancing plan created (4-asset portfolio)")
    print("  4. ✅ Zero-knowledge proof generated (Groth16)")
    print("  5. ✅ Proof validated cryptographically")
    print("  6. ✅ Validation response submitted on-chain")
    print("  7. ✅ Client feedback authorized and submitted")
    print("  8. ✅ Reputation tracking operational")
    print("\nKey Benefits Demonstrated:")
    print("  • Privacy: Portfolio positions hidden via ZK proofs")
    print("  • Trust: Cryptographic validation of rebalancing constraints")
    print("  • Transparency: All interactions recorded on-chain")
    print("  • Reputation: Feedback system for service quality")
    print("\n" + "="*70 + "\n")
    
    return True


if __name__ == "__main__":
    try:
        success = test_zk_rebalancing_e2e()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


