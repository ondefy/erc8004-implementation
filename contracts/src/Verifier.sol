// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 5456446727588836269926737030864831293179417788903562479047451426165774617982;
    uint256 constant alphay  = 10741537565118368300681935480321176033354303765197473118552772425819038175842;
    uint256 constant betax1  = 16131917755045458229340884978579896578640140644744484083488609386990254329830;
    uint256 constant betax2  = 6289679213163780680478046974201970624327316890222860729857882856183126588853;
    uint256 constant betay1  = 5800870601858857711796500511462965023691863904614837587817499537897054232113;
    uint256 constant betay2  = 11316474370034348818063697286673481284515468660867738247757751966798132345651;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 20224901337733398537242186319926968026333520831419097731433145765298922158411;
    uint256 constant deltax2 = 5398968384758400637084642213860986421580559030112999941448758435952326652892;
    uint256 constant deltay1 = 11771170143897996558777409822346635135714700906687898097881629829682485738460;
    uint256 constant deltay2 = 21567849773829046915417778383225804434090402882514351524230165964175082581412;

    
    uint256 constant IC0x = 17505950352559467991232356657710764597864700181871008104556570266079248799354;
    uint256 constant IC0y = 1622413985299650291768559134926573692580025466809439306960490530323689222691;
    
    uint256 constant IC1x = 10958244350843882749329500313443518794811704214908978282932617023984511132124;
    uint256 constant IC1y = 1114520759449460000179479941817919544369599029953481255142482425161347730051;
    
    uint256 constant IC2x = 18726418016028460184930997075688851219262025051560960684522682135609881508347;
    uint256 constant IC2y = 7099998610099191898421413284782290447011315531154854646583548061208723199531;
    
    uint256 constant IC3x = 1215084293713729241239840058289566533301221522159688523785068198015582187922;
    uint256 constant IC3y = 12095040157272357812458292158578377928566469392054908183103939895639096004570;
    
    uint256 constant IC4x = 7344261018038670438942780584459209535287690498196781238532340264007019695770;
    uint256 constant IC4y = 15452294501784884796402094057315062156235679435217276377134927751367805274290;
    
    uint256 constant IC5x = 21174189732537834699766489771733153953715067242319837202280476235115017219325;
    uint256 constant IC5y = 4091926653440657790389847327736259222137123339381348814712252515974832069932;
    
    uint256 constant IC6x = 17742762418632041019378127747315065967916456348509283194440269917749801382789;
    uint256 constant IC6y = 19415217076089847625203262460602596518415655472221138594256799232403300304591;
    
    uint256 constant IC7x = 16565249041188397023611524061800326101129693566871480847046745229660770891207;
    uint256 constant IC7y = 16130169760525280296953593815404120701757316597188407046748644550767516050303;
    
    uint256 constant IC8x = 18683390885016243592852854639507345722980888860462477656791702248466771099120;
    uint256 constant IC8y = 12008192445910244008401908110115776422397712517973159679714152811169143979066;
    
    uint256 constant IC9x = 13437903542494062620421594185018807904378609946576773931001430276207610102534;
    uint256 constant IC9y = 11875267324453511910972258555220107907880650282534863151733857721500374643409;
    
    uint256 constant IC10x = 10424457358759425482202266047919961752195021653319083357514350300447762201229;
    uint256 constant IC10y = 6431201035776539743056677101148052567889068182919815403325565042552425304217;
    
    uint256 constant IC11x = 20356608529378989367310114505370984511644895671244174542785841608583606733899;
    uint256 constant IC11y = 14644005866229453294707382964038133372795170696813326445526541872846784466449;
    
    uint256 constant IC12x = 16922145241964128795756743990780819808626130936014832360356948835510578776827;
    uint256 constant IC12y = 5782546434641170570061300505337818264425374314084226114802398138614089412094;
    
    uint256 constant IC13x = 6493297516872206078164672559209435243578464433812721840060121034899267501320;
    uint256 constant IC13y = 10532935868735990016655840924147881331822787926802896093982220607961699186533;
    
    uint256 constant IC14x = 15220333243972675319773513801046899220859350326583817696852519369008349464288;
    uint256 constant IC14y = 19000492789819714629269318707923900157030081833459064478606150152251170263892;
    
    uint256 constant IC15x = 3948695506279212462369140158556601755532113331379967761375357485505366856315;
    uint256 constant IC15y = 13511968434209261855116929499533623385977344997669313504463580072018891165671;
    
    uint256 constant IC16x = 20876422175142160929692935062551037293933137187461127461895112070787069457818;
    uint256 constant IC16y = 9285049623589575705302180545698460831272317352883001347155539969011353188738;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[16] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
